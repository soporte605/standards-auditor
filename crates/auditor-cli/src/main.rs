use std::{env, process::ExitCode};

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    match args.as_slice() {
        [] => help(),
        [arg] if arg == "--help" || arg == "-h" => help(),
        [arg] if arg == "--version" || arg == "-V" => {
            println!("standards-auditor {}", env!("CARGO_PKG_VERSION"));
            ExitCode::SUCCESS
        }
        _ => {
            eprintln!("Comando no disponible. Usa --help para consultar esta versión.");
            ExitCode::from(2)
        }
    }
}

fn help() -> ExitCode {
    println!(
        "standards-auditor — base del auditor configurable\n\n\
         Uso: standards-auditor [--help | --version]\n\n\
         El comando check y la carga de paquetes todavía no están implementados."
    );
    ExitCode::SUCCESS
}
