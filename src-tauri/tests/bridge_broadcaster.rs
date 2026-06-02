//! Integration test: Bridge WebSocket broadcaster + EventEmitter trait.

use app_lib::bridge::WsBroadcaster;
use serde::Serialize;

#[derive(Clone, Serialize)]
struct TestPayload {
    message: String,
    count: u32,
}

#[tokio::test]
async fn broadcaster_receives_emitted_event() {
    let (broadcaster, mut rx) = WsBroadcaster::new();

    let payload = TestPayload {
        message: "hello bridge".to_string(),
        count: 42,
    };

    broadcaster.emit("test_event", payload.clone());

    let event = rx.recv().await.expect("should receive event");
    assert_eq!(event.event, "test_event");
    let parsed: serde_json::Value = serde_json::from_value(event.payload).unwrap();
    assert_eq!(parsed["message"], "hello bridge");
    assert_eq!(parsed["count"], 42);
}

#[tokio::test]
async fn broadcaster_multiple_subscribers() {
    let (broadcaster, _rx) = WsBroadcaster::new();
    let mut rx2 = broadcaster.0.subscribe();

    broadcaster.emit("multi", serde_json::json!({"id": 1}));

    let event = rx2.recv().await.expect("second subscriber should receive");
    assert_eq!(event.event, "multi");
}

#[tokio::test]
async fn broadcaster_cloneable() {
    let (broadcaster, mut rx) = WsBroadcaster::new();
    let clone = broadcaster.clone();

    clone.emit("from_clone", serde_json::json!({}));

    let event = rx.recv().await.expect("should receive via original rx");
    assert_eq!(event.event, "from_clone");
}
