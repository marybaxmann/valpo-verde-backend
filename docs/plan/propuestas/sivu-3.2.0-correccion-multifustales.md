# SIVU 3.2.0 · Corrección de entradas para multifustales

La finalización de inspecciones, el cierre de OT y el recálculo por anulación
entregan al motor `multifustal`, `numero_fustes` y `dap_fustes_cm`. Cada dato
se toma de la versión de la inspección si el campo consta como registrado,
incluido un valor nulo explícito. Para campos no registrados se usa el árbol
vigente, con el mismo criterio que para `dap_cm`.

La corrección aplica la fila 161 de DICCIONARIO_CAMPOS. En multifustales, las
raíces y el cuello usan el DAP equivalente, el tronco usa el mayor fuste y la
copa baja un nivel respecto del tronco. Si se declaró multifustal y faltan
diámetros válidos de los fustes, tronco y copa quedan sin consecuencia
determinable. Los monofustales mantienen el cálculo por DAP.

El cambio es de composición de entradas y no requiere un nuevo CC
metodológico. El backend del paquete selecciona 3.2. La activación en producción requiere
confirmación de la autora. En 3.2 la huella del cálculo incluye las entradas
multifustales para detectar cambios entre el cálculo y la finalización.

La sesión de validación confirmó 46 de 46 casos el 2026-11-21. El paquete 3.2.0 incluye esta corrección en CC-080.
