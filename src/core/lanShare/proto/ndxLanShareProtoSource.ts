/**
 * Embedded mirror of `ndxLanShare.proto` in the same directory. The
 * standalone `.proto` file exists for human/tooling readability and as
 * the authoritative reference cited in the implementation ledger; this
 * string is the one actually loaded at runtime (written to a real temp
 * file and parsed via `@grpc/proto-loader`'s file-based API), since
 * Electron's main-process build does not copy non-JS assets and adding
 * a build-pipeline asset-copy step would be a wider, riskier change
 * than embedding the schema directly. Keep both files byte-identical;
 * `LanShareProtoSchema.test.ts` does not enforce this automatically.
 */
export const NDX_LAN_SHARE_PROTO_SOURCE = `syntax = "proto3";

// Deliberately no package declaration — see ndxLanShare.proto's own
// comment in the same directory for why a declared package would
// silently break real wire compatibility.

service WarpRegistration {
  rpc RequestCertificate(RegRequest) returns (RegResponse) {}
  rpc RegisterService(ServiceRegistration) returns (ServiceRegistration) {}
}

message RegRequest {
  string ip = 1;
  string hostname = 2;
  string ipv6 = 3;
}

message RegResponse {
  string locked_cert = 1;
}

message ServiceRegistration {
  string service_id = 1;
  string ip = 2;
  uint32 port = 3;
  string hostname = 4;
  uint32 api_version = 5;
  uint32 auth_port = 6;
  string ipv6 = 7;
}
`
