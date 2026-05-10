import re

with open('src/app/oficina/OficinaClient.jsx', 'r') as f:
    content = f.read()

# 1. Add import
import_old = "import EventsAttendanceTab from '@/components/oficina/EventsAttendanceTab';"
import_new = "import EventsAttendanceTab from '@/components/oficina/EventsAttendanceTab';\nimport IntegrationSettingsTab from '@/components/oficina/IntegrationSettingsTab';"
content = content.replace(import_old, import_new)

# 2. Add the tab rendering condition
tab_old = """          ) : activeTab === 'propiedades' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4">{t('ofc_property_approval')}</h3>
              <PropertyApprovalTab />
            </div>
          ) : activeTab === 'equipo' ? ("""

tab_new = """          ) : activeTab === 'propiedades' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-4">{t('ofc_property_approval')}</h3>
              <PropertyApprovalTab />
            </div>
          ) : activeTab === 'integraciones' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              <IntegrationSettingsTab officeId={selectedOffice} />
            </div>
          ) : activeTab === 'equipo' ? ("""

content = content.replace(tab_old, tab_new)

with open('src/app/oficina/OficinaClient.jsx', 'w') as f:
    f.write(content)

print("Done")
