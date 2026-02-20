import { NextFunction, Request, Response } from "express";
import { auth } from "./auth";
import { googleAuthService } from "./google-auth.service";
import { env } from "../../config/env";
import ApiError from "../../shared/errors/api-error";

// ─── Cookie config constants ──────────────────────────────────────────────────

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Controller ───────────────────────────────────────────────────────────────

export class GoogleAuthController {
  /**
   * GET /api/v1/auth/google/initiate
   *
   * Asks Better Auth to build the Google authorization URL (with PKCE state),
   * then issues a 302 redirect to Google's consent screen.
   */
  async googleInitiate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!auth) {
        throw new ApiError(503, "Auth service not ready");
      }

      // Instead of calling signInSocial server-side (which causes cookie loss
      // during the 302 redirect to Google), we render a tiny auto-submitting
      // HTML form that POSTs directly to Better Auth's own endpoint.
      // This way the browser sets cookies from Better Auth's direct response.
      const postLoginCallbackURL = `${env.betterAuthUrl}/api/v1/auth/google/callback`;

      // Override Helmet's CSP to allow the inline script to execute
      res.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'unsafe-inline'",
      );

      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Redirecting to Google...</title></head>
        <body>
          <p>Redirecting to Google login...</p>
          <script>
            fetch('/api/auth/sign-in/social', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({
                provider: 'google',
                callbackURL: '${postLoginCallbackURL}'
              })
            }).then(res => res.json()).then(data => {
              if (data.url) {
                window.location.href = data.url;
              } else if (data.redirect) {
                window.location.href = data.redirect;
              } else {
                document.body.innerHTML = '<p>Error: ' + JSON.stringify(data) + '</p>';
              }
            }).catch(err => {
              document.body.innerHTML = '<p>Error: ' + err.message + '</p>';
            });
          </script>
        </body>
        </html>
      `);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/auth/google/callback
   *
   * Receives the authorization code + state from Google.
   */
  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      if (!auth) {
        throw new ApiError(503, "Auth service not ready");
      }

      // After Better Auth handles the Google code exchange, it redirects here.
      // We check if a session was successfully created.
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session) {
        return res.redirect(
          302,
          `${env.appUrl}/auth/error?reason=session_failed`,
        );
      }

      const { user } = session;

      // Delegate all business logic (upsert user, create Marketplace session) to the service layer
      const { accessToken, refreshToken } =
        await googleAuthService.handleCallback(
          {
            googleId: user.id,
            email: user.email,
            name: user.name,
            picture: user.image ?? undefined,
          },
          req.headers["user-agent"],
          req.ip,
        );

      // Set httpOnly cookies — same pattern as your standard POST /login
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "lax",
        maxAge: ACCESS_TOKEN_MAX_AGE,
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "lax",
        maxAge: REFRESH_TOKEN_MAX_AGE,
      });

      // Clear the Better Auth temporary session cookie to keep things clean
      // (Optional, but recommended since we use our own JWT system)
      res.clearCookie("better-auth.session_token");

      return res.redirect(302, `${env.betterAuthUrl}/api/v1/auth/dashboard`);
    } catch (err: any) {
      console.error("Google OAuth Callback Error:", err);

      // Handle known Better Auth error codes redirected to this callback
      const errorCode = req.query.error as string;
      if (errorCode === "unable_to_link_account") {
        return res.redirect(302, `${env.appUrl}/auth/error?reason=link_failed`);
      }

      if (err instanceof ApiError && err.statusCode === 403) {
        return res.redirect(302, `${env.appUrl}/auth/error?reason=blocked`);
      }
      return next(err);
    }
  }
}

export const googleAuthController = new GoogleAuthController();
