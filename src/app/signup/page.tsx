import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
export const metadata={title:"30日無料で登録",robots:{index:false,follow:false}};
export default function SignupPage(){return <Suspense fallback={<main id="main-content" className="p-8" role="status">登録画面を読み込んでいます…</main>}><AuthForm mode="signup"/></Suspense>;}
