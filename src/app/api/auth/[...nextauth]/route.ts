import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
          // ★ 修正：Googleカレンダーの予定を「読み込み・作成・更新・削除」するための権限に変更
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // ログイン成功時、Googleから渡されたアクセストークンを保存します
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // クライアント側（ブラウザ側）でアクセストークンを使えるようにセッションに含めます
      if (session.user) {
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };