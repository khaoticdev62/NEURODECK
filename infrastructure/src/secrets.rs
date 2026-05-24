use keyring::Entry;

const SERVICE_NAME: &str = "neurodeck";

/// Retrieve the Gemini API key from the OS secure keychain
pub fn get_gemini_api_key() -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, "gemini_api_key")
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    
    entry.get_password()
        .map_err(|e| format!("API Key not found or inaccessible: {}", e))
}

/// Save the Gemini API key to the OS secure keychain
pub fn save_gemini_api_key(key: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, "gemini_api_key")
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    
    entry.set_password(key)
        .map_err(|e| format!("Failed to save API Key: {}", e))
}

/// Delete the Gemini API key from the OS secure keychain
pub fn delete_gemini_api_key() -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, "gemini_api_key")
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    
    entry.delete_password()
        .map_err(|e| format!("Failed to delete API Key: {}", e))
}

/// Test if the OS secure keychain is accessible and writable
pub fn test_keychain_access() -> Result<(), String> {
    let entry = Entry::new("neurodeck_test_keyring", "diagnostic")
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        
    entry.set_password("diagnostic_value")
        .map_err(|e| format!("Failed to write to keyring: {}", e))?;
        
    let pwd = entry.get_password()
        .map_err(|e| format!("Failed to read from keyring: {}", e))?;
        
    if pwd != "diagnostic_value" {
        return Err("Keyring readback value mismatch".to_string());
    }
    
    let _ = entry.delete_password();
    Ok(())
}

/// Retrieve the tunnel token from the OS secure keychain
pub fn get_tunnel_token() -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, "tunnel_token")
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    entry.get_password()
        .map_err(|e| format!("Tunnel token not found or inaccessible: {}", e))
}

/// Save the tunnel token to the OS secure keychain
pub fn save_tunnel_token(token: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, "tunnel_token")
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    entry.set_password(token)
        .map_err(|e| format!("Failed to save Tunnel token: {}", e))
}

/// Delete the tunnel token from the OS secure keychain
pub fn delete_tunnel_token() -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, "tunnel_token")
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    entry.delete_password()
        .map_err(|e| format!("Failed to delete Tunnel token: {}", e))
}

/// Retrieve an SSH profile credential from the OS secure keychain
pub fn get_ssh_credential(profile_name: &str) -> Result<String, String> {
    let username = format!("ssh_{}", profile_name);
    let entry = Entry::new(SERVICE_NAME, &username)
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    entry.get_password()
        .map_err(|e| format!("SSH credential for '{}' not found or inaccessible: {}", profile_name, e))
}

/// Save an SSH profile credential to the OS secure keychain
pub fn save_ssh_credential(profile_name: &str, password: &str) -> Result<(), String> {
    let username = format!("ssh_{}", profile_name);
    let entry = Entry::new(SERVICE_NAME, &username)
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    entry.set_password(password)
        .map_err(|e| format!("Failed to save SSH credential: {}", e))
}

/// Delete an SSH profile credential from the OS secure keychain
pub fn delete_ssh_credential(profile_name: &str) -> Result<(), String> {
    let username = format!("ssh_{}", profile_name);
    let entry = Entry::new(SERVICE_NAME, &username)
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    entry.delete_password()
        .map_err(|e| format!("Failed to delete SSH credential: {}", e))
}

/// Retrieve an SFTP profile credential from the OS secure keychain
pub fn get_sftp_credential(profile_name: &str) -> Result<String, String> {
    let username = format!("sftp_{}", profile_name);
    let entry = Entry::new(SERVICE_NAME, &username)
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    entry.get_password()
        .map_err(|e| format!("SFTP credential for '{}' not found or inaccessible: {}", profile_name, e))
}

/// Save an SFTP profile credential to the OS secure keychain
pub fn save_sftp_credential(profile_name: &str, password: &str) -> Result<(), String> {
    let username = format!("sftp_{}", profile_name);
    let entry = Entry::new(SERVICE_NAME, &username)
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    entry.set_password(password)
        .map_err(|e| format!("Failed to save SFTP credential: {}", e))
}

/// Delete an SFTP profile credential from the OS secure keychain
pub fn delete_sftp_credential(profile_name: &str) -> Result<(), String> {
    let username = format!("sftp_{}", profile_name);
    let entry = Entry::new(SERVICE_NAME, &username)
        .map_err(|e| format!("Failed to access keyring: {}", e))?;
    entry.delete_password()
        .map_err(|e| format!("Failed to delete SFTP credential: {}", e))
}

