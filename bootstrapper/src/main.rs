use std::process::{Command, Stdio};
use std::thread::sleep;
use std::time::Duration;

fn main() {
    println!("Starting NEURODECK Bootstrapper...");
    let binary_name = if cfg!(windows) { "app.exe" } else { "app" };

    loop {
        println!("Launching main application: {}", binary_name);
        let mut child = match Command::new(format!("./{}", binary_name))
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()
        {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Failed to launch main application: {}", e);
                sleep(Duration::from_secs(5));
                continue;
            }
        };

        match child.wait() {
            Ok(status) => {
                if status.success() {
                    println!("Application exited cleanly.");
                    break;
                } else {
                    eprintln!("Application crashed or exited with error: {}", status);
                    println!("Restarting in 3 seconds...");
                    sleep(Duration::from_secs(3));
                }
            }
            Err(e) => {
                eprintln!("Error waiting on application: {}", e);
                sleep(Duration::from_secs(5));
            }
        }
    }
}
