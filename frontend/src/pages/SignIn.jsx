import { SignIn } from '@clerk/clerk-react'

export default function SignInPage() {
  return (
    <div className="theme-muted-teal min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, var(--bg-start), var(--bg-end))' }}>
      <main className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-10">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-sm rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
          <SignIn 
            routing="path" 
            path="/sign-in"
            localization={{
              signIn: {
                start: {
                  // This controls the "Sign in" title
                  title: "Sign in to CampusLens",
                  // This controls the subtitle
                  subtitle: "Use your campus account to continue."
                }
              }
            }}
          />
          
        </div>
      </main>
    </div>
  )
}