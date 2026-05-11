export default function Loading() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, background:'linear-gradient(135deg,#0a0a0f 0%,#1a1a2e 50%,#0a0a0f 100%)' }}>
      <div style={{ textAlign:'center', marginBottom:48 }}>
        <div className="h-4 w-32 bg-white/20 rounded mx-auto mb-12 animate-pulse"></div>
        <div className="h-10 w-64 bg-white/20 rounded mx-auto mb-8 animate-pulse"></div>
        <div className="h-4 w-96 bg-white/20 rounded mx-auto mt-8 animate-pulse"></div>
      </div>
      
      <div style={{ display:'flex', gap:24, flexWrap:'wrap', justifyContent:'center' }}>
        {[...Array(2)].map((_, i) => (
          <div key={i} style={{ width:320, height:350, borderRadius:20, background:'#111', border:'1px solid rgba(255,255,255,0.08)' }} className="animate-pulse">
            <div style={{ height:180, background:'rgba(255,255,255,0.1)' }}></div>
            <div style={{ padding:'20px 24px 24px' }}>
              <div className="h-3 w-24 bg-white/20 rounded mb-4"></div>
              <div className="h-6 w-48 bg-white/20 rounded mb-6"></div>
              <div className="h-4 w-32 bg-white/20 rounded mb-6"></div>
              <div className="h-6 w-20 bg-white/20 rounded-full mt-4"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
