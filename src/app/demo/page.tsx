import { MarketingShell } from "@/components/MarketingShell";
import { DemoExperience } from "@/components/DemoExperience";
import { pageMetadata } from "@/lib/site";
export const metadata=pageMetadata("登録不要の体験デモ｜会話形式の受付フォーム", "士業・不動産・採用の受付を、回答者の立場で体験できます。デモ入力は保存・送信しません。気に入ったテンプレートから、カード不要の30日無料体験へ。", "/demo");
export default async function DemoPage({searchParams}:{searchParams:Promise<{industry?:string}>}) {
 const {industry}=await searchParams;
 return <MarketingShell><section className="section-wrap"><div className="section-heading"><p className="eyebrow">登録せずに体験</p><h1>1問ずつ答える、受付の使い心地。</h1><p>これは保存・送信しないデモです。サンプルの名前・連絡先で気軽にお試しください。</p></div><DemoExperience initialIndustry={industry}/></section></MarketingShell>;
}
