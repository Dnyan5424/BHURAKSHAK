import axios from "axios";
export const API=(import.meta as any).env.VITE_API||"http://localhost:8000";
export const api=axios.create({baseURL:API});
api.interceptors.request.use(c=>{const t=localStorage.getItem("token");if(t)c.headers.Authorization="Bearer "+t;return c});
api.interceptors.response.use(response=>response,error=>{
  if(error.response?.status===401&&!error.config?.url?.includes("/api/auth/login")){
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    if(window.location.pathname!=="/login")window.location.assign("/login");
  }
  return Promise.reject(error);
});
export const role=()=>localStorage.getItem("token")?localStorage.getItem("role"):null;
export const T:any={en:{report:"Report an Issue",track:"Track Petition",map:"Public Map",officer:"Officer",admin:"Admin"},
hi:{report:"समस्या दर्ज करें",track:"याचिका ट्रैक करें",map:"सार्वजनिक नक्शा",officer:"अधिकारी",admin:"प्रशासक"},
mr:{report:"तक्रार नोंदवा",track:"याचिका मागोवा",map:"सार्वजनिक नकाशा",officer:"अधिकारी",admin:"प्रशासक"}};
export const DISCLAIMER="This is an AI-assisted preliminary indication. It is not a legal determination. Official verification is required.";
export const CATS=["Tree cutting or vegetation loss","Quarrying or excavation suspicion","Encroachment suspicion","Illegal construction suspicion","River, lake, or water-body encroachment","Sand mining suspicion","Waste dumping","Other environmental issue"];
export async function download(url:string,name:string){const r=await api.get(url,{responseType:"blob"});const a=document.createElement("a");a.href=URL.createObjectURL(r.data);a.download=name;a.click()}
