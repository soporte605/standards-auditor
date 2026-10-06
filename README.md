# Standards Auditor

Motor en Rust para auditar estándares de ingeniería mediante paquetes configurables por equipo. Nombre provisional.

## Estado

Versión de desarrollo `0.1.0-dev.0`. Esta base incluye workspace, contratos internos, CLI con ayuda y versión, y CI. Todavía no analiza proyectos ni carga YAML. No hay publicaciones ni paquetes descargables.

## Desarrollo

Instala Rust mediante rustup. El archivo `rust-toolchain.toml` fija el compilador y los componentes; Cargo administra las dependencias. Desde esta carpeta:

```sh
cargo run -p auditor-cli -- --help
cargo run -p auditor-cli -- --version
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace --locked
cargo build --workspace --locked
```

El ejecutable de desarrollo queda en `target/debug/standards-auditor`.

## Estructura

```text
crates/
  auditor-cli/     Entrada de consola y futuros reportes
  auditor-core/    Contratos de reglas y hallazgos
packs/            Contrato previsto para paquetes
examples/         Configuración propuesta, aún no ejecutable
docs/             Arquitectura, versiones y roadmap
.github/          CI y plantilla de pull request
```

## Alcance previsto

Paquetes opcionales para pruebas unitarias, SemVer, changelog y documentación. Cada proyecto podrá habilitar reglas, ajustar severidades y parámetros, y excluir archivos. Angular será el primer adaptador de pruebas cuando se incorpore el archivo original de reglas.

Consulta [arquitectura](docs/architecture.md), [plan de entregas](docs/roadmap.md), [contribución](CONTRIBUTING.md) y [versiones](docs/releasing.md).

La licencia y el destino de publicación están pendientes de elección. La publicación en crates.io está deshabilitada.
