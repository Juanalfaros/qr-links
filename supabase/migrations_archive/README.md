# Migraciones archivadas

Estas ~36 migraciones incrementales (`0001` a `0036`) construyeron el schema paso a
paso a lo largo del desarrollo del proyecto, pero varias de ellas crean algo que una
migración posterior modifica o directamente reemplaza (funciones reescritas varias
veces, columnas agregadas y luego eliminadas, vistas reemplazadas por funciones, etc.).

Se consolidaron en un único archivo — `supabase/migrations/0001_baseline.sql` — que
crea directamente el estado final, sin ese ruido histórico. **Una instalación nueva
solo necesita correr ese archivo único.**

Estas quedan acá únicamente como referencia histórica de cómo evolucionó el schema
(ver también [CHANGELOG.md](../../CHANGELOG.md)) — no se aplican en ninguna
instalación, nueva o existente.
