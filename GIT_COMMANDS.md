# Comandos Git - FlapRace

## 📤 Subir Cambios a GitHub

Cuando hagamos cambios en el proyecto, usa estos comandos para subirlos:

### 1. Ver qué archivos cambiaron
```bash
git status
```

### 2. Agregar todos los cambios
```bash
git add .
```

O agregar archivos específicos:
```bash
git add nombre-del-archivo.ts
```

### 3. Hacer commit con un mensaje descriptivo
```bash
git commit -m "Descripción de los cambios"
```

Ejemplos de mensajes:
- `git commit -m "Fix: Corregir error de build"`
- `git commit -m "Feat: Agregar nueva funcionalidad"`
- `git commit -m "Update: Actualizar dependencias"`

### 4. Subir a GitHub
```bash
git push
```

## 🔄 Flujo Completo (Todo en uno)

```bash
# Ver cambios
git status

# Agregar cambios
git add .

# Commit
git commit -m "Tu mensaje aquí"

# Push
git push
```

## 📥 Actualizar desde GitHub

Si hay cambios en GitHub que no tienes localmente:

```bash
git pull
```

## 🔍 Ver Historial

```bash
# Ver commits recientes
git log --oneline

# Ver cambios en un archivo
git diff nombre-del-archivo.ts
```

## ⚠️ Notas Importantes

- **NUNCA** hagas commit de archivos `.env.local` o `.env`
- Siempre revisa `git status` antes de hacer commit
- Usa mensajes de commit descriptivos
- Si Vercel está conectado, automáticamente hará deploy después del push

## 🚀 Después del Push

1. Vercel detectará automáticamente los cambios
2. Iniciará un nuevo build
3. Desplegará la nueva versión

---

**Tip**: Puedes crear un alias en tu terminal para hacer todo más rápido:
```bash
# En PowerShell (agregar a tu perfil)
function gpush { git add .; git commit -m $args[0]; git push }
```

Luego solo usas: `gpush "Tu mensaje"`
