import ProjectBuilder from '@/components/ProjectBuilder';
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;const l=locale==='en'?'en':'ar';return <main className="container"><ProjectBuilder locale={l}/></main>}
