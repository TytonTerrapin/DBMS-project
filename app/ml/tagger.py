"""
ML module for image tagging using BLIP and CLIP models
"""
import torch
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
from transformers import CLIPProcessor, CLIPModel
import nltk
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag
from typing import List, Tuple
import os
from sqlalchemy import insert, delete
from app.db.models import init_db, Photo as DBPhoto, Tag as DBTag, photo_tags

# Global model instances
blip_model = None
blip_processor = None
clip_model = None
clip_processor = None

async def load_models():
    """Load BLIP and CLIP models"""
    global blip_model, blip_processor, clip_model, clip_processor
    
    print("Loading BLIP model...")
    blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
    
    print("Loading CLIP model...")
    clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    # Ensure a local nltk data directory so downloads are available in the venv/project
    nltk_data_dir = os.path.join(os.getcwd(), '.nltk_data')
    os.makedirs(nltk_data_dir, exist_ok=True)
    if nltk_data_dir not in nltk.data.path:
        nltk.data.path.append(nltk_data_dir)

    # Download required NLTK resources quietly into the local nltk_data dir
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', download_dir=nltk_data_dir, quiet=True)

    # Some NLTK installs expect punkt_tab; try to ensure it's available too
    try:
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        # punkt_tab is a different packaging on some platforms; attempt to download
        try:
            nltk.download('punkt_tab', download_dir=nltk_data_dir, quiet=True)
        except Exception:
            # ignore if not available; fallback tokenization will handle in extract_keywords
            pass

    try:
        nltk.data.find('taggers/averaged_perceptron_tagger')
    except LookupError:
        nltk.download('averaged_perceptron_tagger', download_dir=nltk_data_dir, quiet=True)
    
    return True

def extract_keywords(caption: str) -> List[str]:
    """Extract relevant keywords from caption text"""
    # Tokenize and tag parts of speech. If NLTK resources are missing, fall back to simple heuristics.
    try:
        tokens = word_tokenize(caption.lower())
        tagged = pos_tag(tokens)

        # Keep nouns and adjectives as potential tags
        keywords = []
        for word, tag in tagged:
            # NN* for nouns, JJ* for adjectives
            if tag.startswith(('NN', 'JJ')) and len(word) > 2:
                keywords.append(word)

        return list(dict.fromkeys(keywords))  # Remove duplicates while preserving order
    except LookupError:
        # NLTK data missing for tokenizers/taggers — fall back to simple regex word extraction
        import re
        words = re.findall(r"\b[a-z]{3,}\b", caption.lower())
        # Return unique words
        return list(dict.fromkeys(words))

async def generate_caption(image_path: str) -> str:
    """Generate image caption using BLIP"""
    if not blip_model or not blip_processor:
        raise RuntimeError("BLIP model not loaded")
    
    # Load and preprocess image
    image = Image.open(image_path).convert('RGB')
    inputs = blip_processor(image, return_tensors="pt")
    
    # Generate caption
    outputs = blip_model.generate(**inputs)
    caption = blip_processor.decode(outputs[0], skip_special_tokens=True)
    
    return caption

async def score_tags(image_path: str, tags: List[str]) -> List[Tuple[str, float]]:
    """Score tags using CLIP"""
    if not clip_model or not clip_processor:
        raise RuntimeError("CLIP model not loaded")
    
    # Load and preprocess image
    image = Image.open(image_path).convert('RGB')
    
    # Prepare text descriptions
    text_inputs = [f"a photo of {tag}" for tag in tags]
    
    # Process inputs
    inputs = clip_processor(
        text=text_inputs,
        images=[image] * len(tags),
        return_tensors="pt",
        padding=True
    )
    
    # Get similarity scores
    outputs = clip_model(**inputs)
    logits_per_image = outputs.logits_per_image
    probs = logits_per_image.softmax(dim=1)
    
    # Pair tags with their confidence scores
    scored_tags = [(tag, float(prob)) for tag, prob in zip(tags, probs[0])]
    
    # Sort by confidence and filter low-confidence tags
    scored_tags.sort(key=lambda x: x[1], reverse=True)
    return [(tag, score) for tag, score in scored_tags if score > 0.1]

async def process_image(photo_id: int, file_path: str):
    """Process an image through the ML pipeline"""
    try:
        # Generate caption
        caption = await generate_caption(file_path)
        print(f"Caption generated: {caption}")
        
        # Extract keywords from caption
        keywords = extract_keywords(caption)
        print(f"Keywords extracted: {keywords}")
        
        # Score tags with CLIP
        scored_tags = await score_tags(file_path, keywords)
        print(f"Tags scored: {scored_tags}")
        
        # Persist caption and tags to the database
        try:
            engine, SessionLocal = init_db()
            db = SessionLocal()
            try:
                photo = db.query(DBPhoto).filter(DBPhoto.id == photo_id).first()
                if not photo:
                    print(f"Photo id={photo_id} not found in DB")
                else:
                    # Update caption and mark tags_generated
                    photo.caption = caption
                    photo.tags_generated = 1
                    db.add(photo)
                    db.commit()

                    # Clear existing tag associations for this photo
                    db.execute(delete(photo_tags).where(photo_tags.c.photo_id == photo.id))

                    # Insert/associate tags and confidences
                    for tag_name, confidence in scored_tags:
                        # normalize tag
                        name = tag_name.strip().lower()
                        tag = db.query(DBTag).filter(DBTag.name == name).first()
                        if not tag:
                            tag = DBTag(name=name)
                            db.add(tag)
                            db.commit()
                            db.refresh(tag)

                        # Insert association row with confidence
                        db.execute(insert(photo_tags).values(
                            photo_id=photo.id,
                            tag_id=tag.id,
                            confidence=float(confidence)
                        ))
                    db.commit()
            finally:
                db.close()
        except Exception as e:
            print(f"DB persist error for photo {photo_id}: {e}")

        return scored_tags
        
    except Exception as e:
        print(f"Error processing image {photo_id}: {str(e)}")
        raise