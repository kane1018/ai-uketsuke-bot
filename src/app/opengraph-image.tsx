import { ImageResponse } from "next/og";
export const alt = "受付Bot — 30日無料・カード不要の会話形式フォーム";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:80,background:"#0f172a",color:"white",fontFamily:"sans-serif"}}><div style={{display:"flex",fontSize:30,color:"#93c5fd"}}>Reception Bot / chatbot-support.com</div><div style={{display:"flex",flexDirection:"column",fontSize:74,fontWeight:700,lineHeight:1.15}}><span>Every inquiry.</span><span>One question at a time.</span></div><div style={{display:"flex",fontSize:28,color:"#cbd5e1"}}>30 days free · No credit card · No auto-charge</div></div>,size);
}
