# Catálogo de especies del Piloto: datos pendientes (para verificación)

**Estado:** la sección 2 se cargó en la **base de pruebas** el 2026-11-21, con la sesión de Inspector de la responsable y mediante el endpoint de la plataforma (PATCH `/api/sivu/projects/:id/species/:speciesId`, CC-053), que registra quién hizo el cambio. *Schinus molle* quedó como nativa por decisión de la responsable. Sigue sin dato la persistencia del follaje de *Jacaranda mimosifolia*. También se completó la persistencia de *Phoenix canariensis* (perennifolia). La base real no se tocó.

**Resultado en el Piloto:** nativas 15 (15,3 %: quillay, peumo y belloto, endémicos, y pimiento); introducidas 76 (77,6 %); origen no determinado 7 (los árboles sin especie identificada). La composición por género y familia queda completa, salvo los 7 árboles sin especie. El carbono no cambia.

## 1. Por qué importa

Sin género, familia ni origen en el catálogo, varios indicadores quedan incompletos:
- **Origen de las especies:** 31 de 98 árboles sin origen. Los porcentajes de introducidos y nativos se muestran como mínimos.
- **Composición por género y familia y regla 10-20-30:** 31 árboles quedan fuera de esos niveles.
- **Ilustración 3D:** sin tipo de hoja, la forma se deduce del género.

Ningún cálculo de carbono depende de estos campos.

## 2. Especies del catálogo sin rasgos (11)

Valores propuestos con los códigos del catálogo de SIVU (origen respecto de Chile). **Deben verificarse antes de cargarse**; las filas marcadas con «verificar» tienen dudas reales.

| Especie | Género | Familia | Origen | Persistencia del follaje | Tipo de hoja |
|---|---|---|---|---|---|
| *Acer platanoides* | Acer | Sapindaceae | introducida | caducifolia | latifoliada |
| *Araucaria heterophylla* | Araucaria | Araucariaceae | introducida | perennifolia | acicular |
| *Beilschmiedia miersii* | Beilschmiedia | Lauraceae | endemica | perennifolia | latifoliada |
| *Cryptocarya alba* | Cryptocarya | Lauraceae | endemica | perennifolia | latifoliada |
| *Ficus elastica* | Ficus | Moraceae | introducida | perennifolia | latifoliada |
| *Jacaranda mimosifolia* | Jacaranda | Bignoniaceae | introducida | semicaducifolia (verificar) | latifoliada |
| *Olea europaea* | Olea | Oleaceae | introducida | perennifolia | latifoliada |
| *Pittosporum tobira* | Pittosporum | Pittosporaceae | introducida | perennifolia | latifoliada |
| *Pittosporum undulatum* | Pittosporum | Pittosporaceae | introducida | perennifolia | latifoliada |
| *Quillaja saponaria* | Quillaja | Quillajaceae | endemica | perennifolia | latifoliada |
| *Schinus molle* | Schinus | Anacardiaceae | nativa (verificar: algunas fuentes la consideran introducida en Chile central) | perennifolia | latifoliada |

*Phoenix canariensis* ya tiene sus rasgos en el catálogo (palmera, Arecaceae, introducida), aunque le falta la persistencia del follaje.

## 3. Árboles con especie escrita pero sin vínculo al catálogo (46)

Tienen el nombre científico registrado, pero no el vínculo con el catálogo (`species_id`). La especie sí existe en el catálogo:

| Especie | Árboles sin vínculo | De ellos, con evaluación vigente |
|---|---|---|
| *Ulmus minor* | 27 | 0 |
| *Acer pseudoplatanus* | 6 | 3 |
| *Acer negundo* | 5 | 1 |
| *Quillaja saponaria* | 4 | 0 |
| *Lagerstroemia indica* | 2 | 0 |
| *Beilschmiedia miersii* | 1 | 0 |
| *Phoenix canariensis* | 1 | 0 |

Vincularlos es una corrección de datos del inventario. Conviene hacerla con el flujo de identificación de especie de la plataforma, para que quede registrada.

## 4. Efecto esperado

Si se completan las secciones 2 y 3, solo los 7 árboles sin especie identificada quedarían sin origen, frente a los 31 actuales. Los porcentajes de origen y la composición dejarían de ser mínimos, y aparecerían las especies endémicas, que hoy no se ven.
