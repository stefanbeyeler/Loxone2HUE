export interface Light {
  id: string;
  name: string;
  type: string;
  model_id: string;
  product_name: string;
  state: LightState;
  capabilities: Capabilities;
}

export interface LightState {
  on: boolean;
  brightness: number;
  color_temp?: number;
  color?: Color;
  reachable: boolean;
}

export interface Color {
  xy: [number, number];
  gamut?: string;
  hex_rgb?: string;
}

export interface Capabilities {
  supports_color: boolean;
  supports_color_temp: boolean;
  supports_dimming: boolean;
}

export interface Group {
  id: string;
  name: string;
  type: string;
  lights: string[];
  state: GroupState;
  scenes?: Scene[];
}

export interface GroupState {
  all_on: boolean;
  any_on: boolean;
  brightness?: number;
}

export interface Scene {
  id: string;
  name: string;
  group_id: string;
  type: string;
}

export interface Mapping {
  id: string;
  name: string;
  loxone_id: string;
  hue_id: string;
  hue_type: string;
  enabled: boolean;
  description?: string;
}

export interface BridgeInfo {
  id: string;
  ip: string;
  name: string;
}

export interface DeviceCommand {
  on?: boolean;
  brightness?: number;
  color_temp?: number;
  color?: Color;
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export interface StatusMessage {
  type: 'status';
  device: string;
  state: LightState;
}
