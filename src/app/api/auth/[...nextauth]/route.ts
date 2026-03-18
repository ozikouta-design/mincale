import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";

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
  // ★ 追加：明示的にsecretを指定してクラッシュを防ぐ
  secret: process.env.NEXTAUTH_SECRET,
  
  callbacks: {
    async signIn({ user, account }) {
      console.log("=== 🔑 Googleログインコールバック開始 ===");
      
      try {
        // ★ 変更：初期化を関数の「中」に移動し、確実に環境変数を読み込む
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
        
        if (!supabaseUrl || !supabaseServiceKey) {
          console.error("❌ エラー: Supabaseの環境変数が設定されていません");
          return false;
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        if (account && user.email) {
          const defaultSlug = user.email.split("@")[0]; 
          
          // 1. プロフィールの保存
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
            slug: existing?.slug || defaultSlug,
          });

          if (upsertErr) console.error("❌ プロフィール保存エラー:", upsertErr);

          // 2. トークンの保存（地下金庫へ）
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
    async jwt({ token, account }) {
      if (account) { token.accessToken = account.access_token; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { (session as any).accessToken = token.accessToken; }
      return session;
    },
  },
});

export { handler as GET, handler as POST };