@@ .. @@
                 )}
               </button>

+              {/* Google OAuth Divider */}
+              <div className="relative">
+                <div className="absolute inset-0 flex items-center">
+                  <div className="w-full border-t border-glass"></div>
+                </div>
+                <div className="relative flex justify-center text-sm">
+                  <span className="px-2 bg-glass text-gray-300">Or</span>
+                </div>
+              </div>
+
+              {/* Google Sign-in Button */}
+              <button
+                type="button"
+                onClick={handleGoogleSignIn}
+                disabled={isSubmitting || loading || isGoogleLoading}
+                className={`
+                  w-full flex items-center justify-center gap-3
+                  bg-white/10 backdrop-blur-lg border border-gray-300/50 
+                  rounded-xl px-6 py-3 
+                  text-white font-medium
+                  transition-all duration-200
+                  min-h-[48px] touch-manipulation
+                  ${(isSubmitting || loading || isGoogleLoading) 
+                    ? 'opacity-50 cursor-not-allowed' 
+                    : 'hover:bg-white/20 hover:scale-105 hover:-translate-y-1'
+                  }
+                `}
+                aria-label="Sign in with Google"
+              >
+                {isGoogleLoading ? (
+                  <>
+                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
+                    <span>Signing in with Google...</span>
+                  </>
+                ) : (
+                  <>
+                    <img src="/icons/google.svg" alt="" className="w-5 h-5" />
+                    <span>Sign in with Google</span>
+                  </>
+                )}
+              </button>
+
               {/* Toggle Mode */}
               <div className="text-center">