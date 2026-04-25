import TopNav from '@/components/layout/TopNav';

export default function OperationsDashboard() {
  return (
    <>
      <TopNav title="Registro de Análisis de Mercado (ACM)" subtitle="Historial y creación algorítmica de valoración de propiedades." />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 relative z-0">
        <div className="fade-in max-w-6xl mx-auto">
          {/* Header & Filter */}
          <div className="flex justify-between items-end mb-4 px-1">
             <h3 className="font-bold text-gray-900 dark:text-gray-300 text-sm tracking-wide uppercase">Estadísticas de Captación</h3>
             <div className="flex space-x-1 bg-gray-200 dark:bg-dark-panel/80 p-1 rounded-lg border border-transparent dark:border-dark-border cursor-pointer">
                 <div className="bg-white dark:bg-[#2A2D35] text-brand-600 dark:text-white text-xs px-4 py-1.5 rounded-md font-bold shadow-sm flex items-center">
                     Este Mes
                 </div>
             </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="glass-panel text-left rounded-xl p-4 flex flex-col justify-center shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start z-10 relative">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total ACM Creados</p>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 z-10 relative">28</h3>
            </div>
            
            <div className="glass-panel text-left rounded-xl p-4 flex flex-col justify-center shadow-sm">
                <div className="flex justify-between items-start">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Tasa Exclusivas</p>
                </div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">45% <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium ml-1">de 15 cierres</span></h3>
            </div>
            
            <div className="glass-panel text-left rounded-xl p-4 flex flex-col justify-center shadow-sm">
                <div className="flex justify-between items-start">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">% Aceptación</p>
                </div>
                <h3 className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-1">92% <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium ml-1">margen +-$5k</span></h3>
            </div>

            <div className="glass-panel text-left bg-gradient-to-br from-brand-50 to-white dark:from-dark-panel dark:to-[#161a22] rounded-xl p-4 flex flex-col justify-center shadow-sm relative overflow-hidden">
                <p className="text-[10px] text-brand-600 dark:text-brand-300 uppercase font-bold tracking-wider relative z-10 leading-tight">Variación ACM vs Venta</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 relative z-10 tracking-tight flex items-end">
                    +4.5% 
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 ml-2 mb-1.5">promedio</span>
                </h3>
            </div>
          </div>

          <div className="flex justify-between items-end mb-4 px-1">
             <div className="flex space-x-2">
                 <button className="bg-gray-200 dark:bg-dark-panel border border-brand-500/30 text-brand-700 dark:text-brand-300 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center">
                     Todos
                 </button>
             </div>
             <button className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-lg shadow-brand-500/25 flex items-center transition-all transform hover:scale-105">
                 <span>Nuevo ACM</span>
             </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-dark-panel rounded-xl shadow-xl border border-gray-200 dark:border-dark-border transition-colors pb-16">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-200 dark:border-dark-border">
                          <th className="py-3 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Propiedad / Lead</th>
                          <th className="py-3 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Zona Geográfica</th>
                          <th className="py-3 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status pipeline</th>
                          <th className="py-3 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Acción</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border relative">
                      <tr className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                          <td className="py-4 px-5">
                              <div className="flex items-center cursor-pointer">
                                  <div>
                                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Lote de Desarrollo Uvita</p>
                                  </div>
                              </div>
                          </td>
                          <td className="py-4 px-5"><p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Uvita</p></td>
                          <td className="py-4 px-5">
                             <div className="inline-flex cursor-pointer items-center justify-center w-28 px-2 py-1.5 rounded text-[10px] font-bold badge-draft uppercase tracking-wider border border-gray-300/50">
                                  Configuración
                              </div>
                          </td>
                          <td className="py-4 px-5 text-right">
                              <button className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-white bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border hover:bg-brand-500 dark:hover:bg-brand-600 px-3 py-1.5 rounded transition-all shadow-sm">Editar</button>
                          </td>
                      </tr>
                  </tbody>
              </table>
          </div>

        </div>
      </div>
    </>
  );
}
