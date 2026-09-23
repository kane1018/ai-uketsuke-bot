type Copy = {opening_message: string | null; cta_message: string | null};
// Only propagate untouched generated copy. Human-written copy always wins.
export function syncUntouchedCopy(current:Copy, previous:Copy, next:Copy) {
 const result:Partial<Copy>={};
 for(const key of ["opening_message","cta_message"] as const){
  if(current[key]===previous[key] && previous[key]!==next[key])result[key]=next[key];
 }
 return result;
}
