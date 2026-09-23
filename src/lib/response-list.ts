export function responseListParams(input: {page?:string;status?:string}) {
  const n=Number(input.page??1);
  const page=Number.isSafeInteger(n)&&n>0?Math.min(n,100000):1;
  const status=["new","contacted","closed"].includes(input.status??"")?input.status:undefined;
  return {page,status,size:25,offset:(page-1)*25};
}
export function responseListHref(id:string,page:number,status:string){const query=new URLSearchParams();if(page>1)query.set("page",String(page));if(status)query.set("status",status);const suffix=query.toString();return `/dashboard/bots/${encodeURIComponent(id)}/responses${suffix?`?${suffix}`:""}`;}
