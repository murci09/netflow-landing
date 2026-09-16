# CLAUDE.md — NetFlow Agencia

> Responsable técnico: Santiago Saleme — Desarrollador Web Frontend.
> Este archivo define el stack, las convenciones y el **protocolo de auto-activación de skills**.
> Colocar en la raíz del repo (Claude Code lo lee automáticamente) o pegar en
> "Instrucciones del proyecto" en claude.ai.

---

## 1. Perfil del equipo y stack

- **Stack**: HTML5, CSS3/SASS, JavaScript, React, Next.js (App Router), Tailwind CSS, Node.js/Express.
- **Idioma**: español rioplatense, tono de par técnico. Explicaciones concisas.
- **Entregables de código**: mobile-first, HTML semántico, accesible (WCAG AA), optimizado para SEO y CRO.
- **Plantilla base de landings de clientes**: `index.html` + `styles.css` del proyecto NetFlow.
  Se adapta la marca (textos, CTAs, WhatsApp, servicios) **sin alterar** arquitectura semántica,
  nombres de clases, formulario cualificador de 3 pasos ni atributos ARIA.

---

## 2. Protocolo de auto-activación (routing table)

Regla general: al recibir un prompt maestro, **clasificar antes de responder** según los triggers
de abajo y aplicar la skill correspondiente sin pedir confirmación. Si dos reglas coinciden,
gana la de mayor especificidad. Si ninguna coincide, responder en modo consultivo normal.

| #   | Trigger (palabras clave en el prompt)                                                                        | Skill / capacidad a activar                                          | Salida esperada                                                |
| --- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| R1  | "landing", "landing page", "página de captación", "web para el Dr./Dra.", "adaptar plantilla"                | `netflow-landing` (skill propia) + `frontend-design`                 | `index.html` completo, mobile-first, listo para guardar        |
| R2  | "componente", "React", "Next.js", "Tailwind", "UI", "dashboard", "rediseñar"                                 | `frontend-design`                                                    | Componente `.jsx`/`.tsx` con tokens de diseño del proyecto     |
| R3  | "API", "endpoint", "backend", "Express", "route handler", "server action"                                    | `api-contract` (skill propia)                                        | Contrato REST + handler + validación + manejo de errores       |
| R4  | "bot de WhatsApp", "WhatsApp Business API", "Twilio", "chatbot", "ManyChat", "flujo de mensajes"             | `whatsapp-automation` (skill propia) + plugin `twilio-developer-kit` | Diagrama de flujo + webhook + plantillas de mensaje aprobables |
| R5  | "n8n", "Make", "webhook", "automatización", "integración", "CRM", "pipeline de leads"                        | `automation-blueprint` (skill propia)                                | JSON de workflow + mapa de nodos + puntos de fallo             |
| R6  | "base de datos", "diseño de BD", "esquema", "Prisma", "Supabase", "Postgres", "modelo de datos"              | `db-design` (skill propia) + MCP `postgres`/`supabase`               | ERD en texto + DDL + índices + política RLS                    |
| R7  | "auth", "login", "sesión", "roles", "permisos", "JWT", "NextAuth"                                            | `auth-patterns` (skill propia)                                       | Flujo de auth + middleware + matriz de permisos                |
| R8  | "test", "testing", "e2e", "Playwright", "Vitest", "cobertura"                                                | Plugin `typescript-lsp` + MCP `playwright`                           | Suite de tests + comando de ejecución                          |
| R9  | "deploy", "despliegue", "CI", "GitHub Actions", "Vercel", "Netlify"                                          | Plugins `github` + `vercel`/MCP Netlify                              | Workflow YAML + checklist de release                           |
| R10 | "commit", "PR", "pull request", "revisar rama"                                                               | Plugins `commit-commands` + `pr-review-toolkit`                      | Commit convencional / review estructurada                      |
| R11 | "auditoría", "performance", "Lighthouse", "Core Web Vitals", "SEO técnico"                                   | `web-audit` (skill propia)                                           | Informe priorizado por impacto/esfuerzo con líneas a modificar |
| R12 | Cualquier prompt que mencione datos de un médico/clínica (nombre, matrícula, especialidad, ciudad, WhatsApp) | R1 en modo "adaptación de plantilla"                                 | `index.html` completo adaptado a la marca del profesional      |

**Reglas transversales (siempre activas):**

- Mobile-first: escribir primero la regla base y luego los `@media (min-width: …)`.
- Accesibilidad: `alt` significativos, `aria-*` coherentes, foco visible, orden de encabezados.
- SEO: `<title>`, meta description, canonical, OpenGraph, JSON-LD (`Organization`, `FAQPage`,
  y `Physician`/`MedicalClinic` en landings de médicos).
- CRO: un CTA primario por vista, prueba social antes del precio, formulario progresivo.
- Datos médicos: nunca inventar matrículas, títulos, resultados clínicos ni testimonios.
  Los placeholders van marcados con comentario `<!-- REEMPLAZAR -->`.

---

## 3. Stack de plugins y MCPs recomendado

### Marketplace oficial de Anthropic (Claude Code)

```bash
# Se agrega solo la primera vez; si no, agregarlo a mano:
/plugin marketplace add anthropics/claude-plugins-official
/plugin marketplace add anthropics/claude-plugins-community   # comunidad, validada por Anthropic
```

Plugins base para NetFlow:

```bash
/plugin install typescript-lsp@claude-plugins-official     # requiere: npm i -g typescript-language-server
/plugin install security-guidance@claude-plugins-official  # revisión de vulnerabilidades por cambio
/plugin install commit-commands@claude-plugins-official
/plugin install pr-review-toolkit@claude-plugins-official
/plugin install github@claude-plugins-official
/plugin install vercel@claude-plugins-official
/plugin install supabase@claude-plugins-official
/plugin install figma@claude-plugins-official
/plugin install linear@claude-plugins-official
/plugin install sentry@claude-plugins-official
/plugin install plugin-dev@claude-plugins-official          # para crear las skills propias de NetFlow
```

### MCPs por línea de trabajo

```bash
# Documentación siempre actualizada de Claude Code
claude mcp add --scope user --transport http claude-code-docs https://code.claude.com/docs/mcp

# Navegador real: E2E, auditorías visuales, verificación de landings
claude mcp add playwright -- npx -y @playwright/mcp@latest

# Base de datos
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://USER:PASS@HOST:5432/DB

# Comunicaciones (WhatsApp/SMS/Verify) — vía plugin twilio-developer-kit o MCP propio
```

> Verificar el nombre y la URL de cada servidor en su documentación oficial antes de instalar:
> un MCP corre con tus privilegios de usuario. No instalar de fuentes que no controlemos.

---

## 4. Cómo crear las skills propias de NetFlow

Cada skill es una carpeta con un `SKILL.md`:

```
.claude/skills/
├── netflow-landing/SKILL.md
├── whatsapp-automation/SKILL.md
├── automation-blueprint/SKILL.md
├── db-design/SKILL.md
├── auth-patterns/SKILL.md
├── api-contract/SKILL.md
└── web-audit/SKILL.md
```

El `description` del frontmatter es lo que dispara la activación automática: debe listar los
triggers en lenguaje natural, no describir la skill de forma abstracta.

```markdown
---
name: netflow-landing
description: >
  Usar SIEMPRE que se pidan landings, páginas de captación o sitios para médicos, clínicas,
  consultorios o centros de salud, o cuando se pasen datos de un profesional (nombre,
  especialidad, matrícula, ciudad, WhatsApp, servicios) para armar su web. Adapta la plantilla
  base de NetFlow (index.html + styles.css) manteniendo arquitectura semántica, clases,
  formulario cualificador de 3 pasos y accesibilidad. No usar para componentes sueltos.
---

# Landing de captación NetFlow

## Procedimiento

1. Leer `templates/index.html` y `templates/styles.css`.
2. Mapear los datos del profesional a: <title>, meta description, OG, JSON-LD, H1, subtítulo,
   3 dolores, 7 pasos del sistema, capacidades, ICP, planes, testimonios, FAQ, formulario, footer.
3. Reemplazar todos los `wa.me/` por el número del cliente.
4. Marcar con `<!-- REEMPLAZAR -->` todo dato no provisto. Nunca inventarlo.
5. Entregar `index.html` completo, sin fragmentos parciales.

## Checklist de salida

- [ ] Mobile-first verificado a 320px
- [ ] Contraste AA en textos sobre fondo oscuro
- [ ] JSON-LD válido (Organization + FAQPage + Physician)
- [ ] Un solo H1, jerarquía de encabezados correcta
- [ ] CTAs con `data-action` para medición
```

Para generar el resto: `/plugin-dev:create-skill` o pedirlo directamente en conversación.

---

## 5. Participación del equipo virtual

- **Operations Consultant**: definió la tabla de enrutamiento como SOP y la estructura de carpetas
  de skills para que sea replicable por cualquier integrante del equipo técnico.
- **Performance Marketing Lead**: aportó las reglas transversales de CRO y medición (`data-action`
  en CTAs, prueba social antes del precio).
- **Healthcare Specialist**: fijó la restricción de no inventar matrículas, resultados clínicos ni
  testimonios, y el uso obligatorio de placeholders marcados.

Método: se partió del stack real declarado por el responsable técnico, se verificó contra la
documentación oficial de Claude Code (marketplaces, plugins y MCP) y se tradujo a triggers
en lenguaje natural sobre los prompts que el equipo ya usa.
