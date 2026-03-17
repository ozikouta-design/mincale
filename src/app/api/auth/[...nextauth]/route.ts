import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  callbacks: {
    async signIn({ user, account }) {
      console.log("=== 🔑 Googleログインコールバック開始 ===");
      console.log("ログインしたユーザー:", user.email);
      
      if (account && user.email) {
        const defaultSlug = user.email.split("@")[0]; // oz.ikouta になります
        
        const { data: existing, error: selectError } = await supabase
          .from("profiles")
          .select("slug")
          .eq("email", user.email)
          .single();
        
        const { error: upsertError } = await supabase.from("profiles").upsert({
          email: user.email,
          name: user.name,
          slug: existing?.slug || defaultSlug,
          ...(account.refresh_token && { google_refresh_token: account.refresh_token })
        });

        if (upsertError) {
          console.error("❌ Supabase保存エラー:", upsertError.message);
        } else {
          console.log("✅ Supabaseへのプロフィール＆トークン保存成功！");
        }
      }
      return true;
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