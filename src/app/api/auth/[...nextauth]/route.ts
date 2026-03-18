import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";

// ★追加：トークンが期限切れになった際に自動で更新する関数
async function refreshAccessToken(token: any) {
  try {
    let refreshToken = token.refreshToken;
    
    // JWT内にリフレッシュトークンがない場合はSupabaseから取得
    if (!refreshToken && token.email) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data } = await supabaseAdmin.from('user_tokens').select('refresh_token').eq('email', token.email).single();
      if (data?.refresh_token) {
        refreshToken = data.refresh_token;
      }
    }

    if (!refreshToken) throw new Error("No refresh token available");

    const response = await fetch("https://oauth2.googleapis.com/token", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      // Googleは新しいリフレッシュトークンを返さないことがあるので、その場合は既存のものを使用
      refreshToken: refreshedTokens.refresh_token ?? refreshToken, 
    };
  } catch (error) {
    console.error("❌ トークンリフレッシュエラー:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/calendar",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  
  callbacks: {
    async signIn({ user, account }) {
      console.log("=== 🔑 Googleログインコールバック開始 ===");
      
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
        
        if (!supabaseUrl || !supabaseServiceKey) {
          console.error("❌ エラー: Supabaseの環境変数が設定されていません");
          return false;
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        if (account && user.email) {
          const rawSlug = user.email.split("@")[0];
          const safeSlug = rawSlug
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

          const { data: existing, error: fetchErr } = await supabaseAdmin
            .from("profiles")
            .select("slug")
            .eq("email", user.email)
            .single();
            
          if (fetchErr && fetchErr.code !== 'PGRST116') {
             console.error("❌ プロフィール取得エラー:", fetchErr);
          }
          
          const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert({
            email: user.email,
            name: user.name,
            slug: existing?.slug || safeSlug,
          });

          if (upsertErr) console.error("❌ プロフィール保存エラー:", upsertErr);

          if (account.refresh_token) {
            const { error: tokenErr } = await supabaseAdmin.from("user_tokens").upsert({
              email: user.email,
              refresh_token: account.refresh_token
            });
            if (tokenErr) console.error("❌ トークン保存エラー:", tokenErr);
          }
        }
        return true;
      } catch (error) {
        console.error("❌ signInコールバック内で予期せぬエラー:", error);
        return false;
      }
    },
    // ★ 変更：JWTコールバック内で有効期限をチェックし、必要ならリフレッシュする
    async jwt({ token, account, user }) {
      // 初回ログイン時
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          refreshToken: account.refresh_token,
          email: user.email,
        };
      }

      // トークンがまだ有効な場合 (猶予として有効期限の5分前まで)
      if (Date.now() < (token.accessTokenExpires as number) - 5 * 60 * 1000) {
        return token;
      }

      // アクセストークンが期限切れ、または期限間近の場合はリフレッシュする
      console.log("🔄 アクセストークンをリフレッシュします...");
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (session.user) { 
        (session as any).accessToken = token.accessToken; 
        (session as any).error = token.error;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };