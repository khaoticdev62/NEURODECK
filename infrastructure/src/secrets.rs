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
