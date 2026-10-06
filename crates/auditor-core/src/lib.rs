//! Contratos iniciales para reglas independientes de la interfaz de consola.
use std::path::{Path, PathBuf};

/// Severidad de un incumplimiento detectado.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Warning,
    Error,
}

/// Hallazgo que podrán consumir los reportes de consola y JSON.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Finding {
    pub rule_id: String,
    pub severity: Severity,
    pub message: String,
    pub path: Option<PathBuf>,
    /// Número de línea, empezando por uno, cuando se conoce.
    pub line: Option<usize>,
}

/// Contrato interno experimental; no es una ABI de plugins dinámicos.
pub trait Rule {
    fn id(&self) -> &str;
    fn evaluate(&self, project_root: &Path) -> Result<Vec<Finding>, std::io::Error>;
}
