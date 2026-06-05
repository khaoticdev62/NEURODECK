-- Test plugin fixture
-- Used for: plugin loading tests, Lua sandbox tests, command registration tests

local function hello_world(args)
    print("Hello from test plugin! Args: " .. tostring(args))
    return "success"
end

local function error_trigger(args)
    error("Intentional test error")
end

registerCommand("test_hello", hello_world)
registerCommand("test_error", error_trigger)

print("Test plugin loaded successfully")
