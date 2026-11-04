import os

base_dir = r'C:\Users\angel\Desktop\proyecto-economia'
backup_file = os.path.join(base_dir, 'Asesor-financiero_backup.html')

with open(backup_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

os.makedirs(os.path.join(base_dir, 'css'), exist_ok=True)
os.makedirs(os.path.join(base_dir, 'js'), exist_ok=True)

# 1. css/style.css (lines 14 to 93, index 13 to 92 inclusive)
css_content = ''.join(lines[13:93])
with open(os.path.join(base_dir, 'css', 'style.css'), 'w', encoding='utf-8') as f:
    f.write(css_content)
print('css/style.css written successfully.')

# 2. js/utils.js
part_tax = ''.join(lines[1465:1511])
part_toast = ''.join(lines[1886:1912])
part_shared = ''.join(lines[6060:6071])

utils_js = f"""// ===== CONFIGURACIÓN FISCAL, HUSOS HORARIOS & UTILIDADES GENERALES =====

{part_tax}

{part_toast}

// Declaración compartida de eventos de auditoría y utilidades auxiliares
let auditE = [];

{part_shared}
"""
with open(os.path.join(base_dir, 'js', 'utils.js'), 'w', encoding='utf-8') as f:
    f.write(utils_js)
print('js/utils.js written successfully.')

# 3. js/audit.js
part_audit = ''.join(lines[2232:2295])
audit_js = f"""// ===== BITÁCORA DE AUDITORÍA =====

let activityLog = [];

{part_audit}
"""
with open(os.path.join(base_dir, 'js', 'audit.js'), 'w', encoding='utf-8') as f:
    f.write(audit_js)
print('js/audit.js written successfully.')

# 4. js/requests.js
part_badge = ''.join(lines[2208:2218])
part_requests = ''.join(lines[2500:2851])
requests_js = f"""// ===== SISTEMA DE CANCELACIONES Y SOLICITUDES DE AUTORIZACIÓN =====

let cancelRequests = [];

{part_badge}

{part_requests}
"""
with open(os.path.join(base_dir, 'js', 'requests.js'), 'w', encoding='utf-8') as f:
    f.write(requests_js)
print('js/requests.js written successfully.')

# 5. js/shifts.js
part_shifts_head = ''.join(lines[1469:1473])
part_shifts_body = ''.join(lines[1512:1695])
part_ticket_print = ''.join(lines[1695:1768])
shifts_js = f"""// ===== CONTROL DE TURNOS Y ARQUEOS DE CAJA =====

{part_shifts_head}

{part_shifts_body}

{part_ticket_print}
"""
with open(os.path.join(base_dir, 'js', 'shifts.js'), 'w', encoding='utf-8') as f:
    f.write(shifts_js)
print('js/shifts.js written successfully.')

# 6. js/auth.js
part_auth_constants = ''.join(lines[1768:1805])
part_auth_vars = "let currentUser = null;\nlet systemUsers = [];\nlet currentUsersSubSection = 'users';\n\n"
part_auth_core = ''.join(lines[1811:1886])
part_auth_modals = ''.join(lines[1913:2208])
part_auth_access = ''.join(lines[2219:2232])
part_auth_crud = ''.join(lines[2295:2500])

auth_js = f"""// ===== CONTROL DE ACCESO BASADO EN ROLES (RBAC) & GESTIÓN DE USUARIOS =====

{part_auth_constants}

{part_auth_vars}
{part_auth_core}

{part_auth_modals}

{part_auth_access}

{part_auth_crud}
"""
with open(os.path.join(base_dir, 'js', 'auth.js'), 'w', encoding='utf-8') as f:
    f.write(auth_js)
print('js/auth.js written successfully.')

# 7. js/advisor.js
part_scoped = ''.join(lines[2851:2886])
part_advisor = ''.join(lines[3170:3581])

advisor_js = f"""// ===== ASESOR FINANCIERO, PROYECCIONES & IA COPILOT =====

{part_scoped}

{part_advisor}
"""
advisor_js = advisor_js.replace('const auditE=[];', '// auditE inicializado en utils.js')

with open(os.path.join(base_dir, 'js', 'advisor.js'), 'w', encoding='utf-8') as f:
    f.write(advisor_js)
print('js/advisor.js written successfully.')

# 8. js/pos.js
part_pos = ''.join(lines[3581:6060])
pos_js = f"""// ===== MÓDULO DE PUNTO DE VENTA (POS), CATÁLOGO & ESTADÍSTICAS =====

{part_pos}
"""
with open(os.path.join(base_dir, 'js', 'pos.js'), 'w', encoding='utf-8') as f:
    f.write(pos_js)
print('js/pos.js written successfully.')

# 9. js/app.js
part_nav = ''.join(lines[2888:3170])
app_js = f"""// ===== NAVEGACIÓN, ORQUESTACIÓN & ARRANQUE DE LA APLICACIÓN =====

{part_nav}

// ===== INICIALIZACIÓN GLOBAL DEL SISTEMA =====
function startApp() {{
    initAuthAndUsers();
    if (window.lucide && typeof lucide.createIcons === 'function') {{
        lucide.createIcons();
    }}
}}

if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', startApp);
}} else {{
    startApp();
}}
"""
with open(os.path.join(base_dir, 'js', 'app.js'), 'w', encoding='utf-8') as f:
    f.write(app_js)
print('js/app.js written successfully.')

# 10. index.html and Asesor-financiero.html
part_head = ''.join(lines[:12])
part_body = ''.join(lines[95:1462])
part_tail = ''.join(lines[6074:])

index_html = (
    part_head +
    '<link rel="stylesheet" href="css/style.css">\n' +
    '</head>\n' +
    part_body + '\n' +
    '<!-- SCRIPTS MODULARES -->\n' +
    '<script src="js/utils.js"></script>\n' +
    '<script src="js/audit.js"></script>\n' +
    '<script src="js/requests.js"></script>\n' +
    '<script src="js/shifts.js"></script>\n' +
    '<script src="js/auth.js"></script>\n' +
    '<script src="js/advisor.js"></script>\n' +
    '<script src="js/pos.js"></script>\n' +
    '<script src="js/app.js"></script>\n\n' +
    part_tail
)

with open(os.path.join(base_dir, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(index_html)
print('index.html written successfully.')

with open(os.path.join(base_dir, 'Asesor-financiero.html'), 'w', encoding='utf-8') as f:
    f.write(index_html)
print('Asesor-financiero.html updated with modular architecture successfully.')
