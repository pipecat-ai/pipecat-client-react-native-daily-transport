import {
  MediaDeviceInfo,
  MediaStreamTrack,
} from '@daily-co/react-native-webrtc';
import TypedEmitter from 'typed-emitter';
export type TransportState =
  | 'disconnected'
  | 'initializing'
  | 'initialized'
  | 'authenticating'
  | 'authenticated'
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'disconnecting'
  | 'error';
export enum TransportStateEnum {
  DISCONNECTED = 'disconnected',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  READY = 'ready',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error',
}
export type Participant = {
  id: string;
  name: string;
  local: boolean;
};
/**
 * Copyright (c) 2024, Daily.
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */
export class RTVIError extends Error {
  readonly status: number | undefined;
  constructor(message?: string, status?: number | undefined);
}
export class ConnectionTimeoutError extends RTVIError {
  constructor(message?: string | undefined);
}
export class StartBotError extends RTVIError {
  readonly error: string;
  constructor(message?: string | undefined, status?: number);
}
export class TransportStartError extends RTVIError {
  constructor(message?: string | undefined);
}
export class BotNotReadyError extends RTVIError {
  constructor(message?: string | undefined);
}
export class UnsupportedFeatureError extends RTVIError {
  readonly feature: string;
  constructor(feature: string, source?: string, message?: string);
}
export type DeviceArray = Array<'cam' | 'mic' | 'speaker'>;
export type DeviceErrorType =
  | 'in-use'
  | 'permissions'
  | 'undefined-mediadevices'
  | 'not-found'
  | 'constraints'
  | 'unknown';
export type DeviceErrorDetails = Record<
  string,
  string | boolean | number | Error
>;
export class DeviceError extends RTVIError {
  readonly devices: DeviceArray;
  readonly type: DeviceErrorType;
  readonly details: DeviceErrorDetails | undefined;
  constructor(
    devices: DeviceArray,
    type: DeviceErrorType,
    message?: string,
    details?: DeviceErrorDetails
  );
}
export const RTVI_PROTOCOL_VERSION = '1.0.0';
export const RTVI_MESSAGE_LABEL = 'rtvi-ai';
/**
 * Messages the corresponding server-side client expects to receive about
 * our client-side state.
 */
export enum RTVIMessageType {
  /** Outbound Messages */
  CLIENT_READY = 'client-ready',
  DISCONNECT_BOT = 'disconnect-bot',
  CLIENT_MESSAGE = 'client-message',
  APPEND_TO_CONTEXT = 'append-to-context',
  /**
   * Inbound Messages
   * Messages the server-side client sends to our client-side client regarding
   * its state or other non-service-specific messaging.
   */
  BOT_READY = 'bot-ready', // Bot is connected and ready to receive messages
  ERROR = 'error', // Bot initialization error
  METRICS = 'metrics', // Bot reporting metrics
  SERVER_MESSAGE = 'server-message', // Custom server-to-client message
  SERVER_RESPONSE = 'server-response', // Server response to client message
  ERROR_RESPONSE = 'error-response', // Error message in response to an outbound message
  APPEND_TO_CONTEXT_RESULT = 'append-to-context-result', // Result of appending to context
  /** Transcription Messages */
  USER_TRANSCRIPTION = 'user-transcription', // Local user speech to text transcription (partials and finals)
  BOT_TRANSCRIPTION = 'bot-transcription', // Bot full text transcription (sentence aggregated)
  USER_STARTED_SPEAKING = 'user-started-speaking', // User started speaking
  USER_STOPPED_SPEAKING = 'user-stopped-speaking', // User stopped speaking
  BOT_STARTED_SPEAKING = 'bot-started-speaking', // Bot started speaking
  BOT_STOPPED_SPEAKING = 'bot-stopped-speaking', // Bot stopped speaking
  /** LLM Messages */
  USER_LLM_TEXT = 'user-llm-text', // Aggregated user input text which is sent to LLM
  BOT_LLM_TEXT = 'bot-llm-text', // Streamed token returned by the LLM
  BOT_LLM_STARTED = 'bot-llm-started', // Bot LLM inference starts
  BOT_LLM_STOPPED = 'bot-llm-stopped', // Bot LLM inference stops
  LLM_FUNCTION_CALL = 'llm-function-call', // Inbound function call from LLM
  LLM_FUNCTION_CALL_RESULT = 'llm-function-call-result', // Outbound result of function call
  BOT_LLM_SEARCH_RESPONSE = 'bot-llm-search-response', // Bot LLM search response
  /** TTS Messages */
  BOT_TTS_TEXT = 'bot-tts-text', // Bot TTS text output (streamed word as it is spoken)
  BOT_TTS_STARTED = 'bot-tts-started', // Bot TTS response starts
  BOT_TTS_STOPPED = 'bot-tts-stopped',
}
export type BotReadyData = {
  version: string;
  about?: unknown;
};
type PlatformDetailsValue = undefined | string | number | boolean;
type NestedPlatformDetails =
  | PlatformDetailsValue
  | Record<string, PlatformDetailsValue>;
export interface AboutClientData {
  library: string;
  library_version?: string;
  platform?: string;
  platform_version?: string;
  platform_details?: Record<string, NestedPlatformDetails>;
}
export type ClientReadyData = {
  version: string;
  about: AboutClientData;
};
export type ErrorData = {
  message: string;
  fatal: boolean;
};
export type PipecatMetricData = {
  processor: string;
  value: number;
};
export type PipecatMetricsData = {
  processing?: PipecatMetricData[];
  ttfb?: PipecatMetricData[];
  characters?: PipecatMetricData[];
};
export type TranscriptData = {
  text: string;
  final: boolean;
  timestamp: string;
  user_id: string;
};
export type BotLLMTextData = {
  text: string;
};
export type BotTTSTextData = {
  text: string;
};
export type ServerMessageData = {
  data: any;
};
export type ClientMessageData = {
  t: string;
  d?: unknown;
};
export type LLMSearchResult = {
  text: string;
  confidence: number[];
};
export type BotLLMSearchResponseData = {
  search_result?: string;
  rendered_content?: string;
  origins: LLMSearchOrigin[];
};
export type LLMSearchOrigin = {
  site_uri?: string;
  site_title?: string;
  results: LLMSearchResult[];
};
export type LLMFunctionCallData = {
  function_name: string;
  tool_call_id: string;
  args: Record<string, unknown>;
};
export type LLMFunctionCallResult = Record<string, unknown> | string;
export type LLMFunctionCallResultResponse = {
  function_name: string;
  tool_call_id: string;
  args: Record<string, unknown>;
  result: LLMFunctionCallResult;
};
export type LLMContextMessage = {
  role: 'user' | 'assistant';
  content: unknown;
  run_immediately?: boolean;
};
export type AppendToContextResultData = {
  result: Record<string, unknown> | string;
};
export function setAboutClient(about: AboutClientData): void;
export class RTVIMessage {
  id: string;
  label: string;
  type: string;
  data: unknown;
  constructor(type: string, data: unknown, id?: string);
  static clientReady(): RTVIMessage;
  static disconnectBot(): RTVIMessage;
  static error(message: string, fatal?: boolean): RTVIMessage;
}
export enum RTVIEvent {
  /** local connection state events */
  Connected = 'connected',
  Disconnected = 'disconnected',
  TransportStateChanged = 'transportStateChanged',
  /** remote connection state events */
  BotConnected = 'botConnected',
  BotReady = 'botReady',
  BotDisconnected = 'botDisconnected',
  Error = 'error',
  /** server messaging */
  ServerMessage = 'serverMessage',
  ServerResponse = 'serverResponse',
  MessageError = 'messageError',
  /** service events */
  Metrics = 'metrics',
  BotStartedSpeaking = 'botStartedSpeaking',
  BotStoppedSpeaking = 'botStoppedSpeaking',
  UserStartedSpeaking = 'userStartedSpeaking',
  UserStoppedSpeaking = 'userStoppedSpeaking',
  UserTranscript = 'userTranscript',
  BotTranscript = 'botTranscript',
  BotLlmText = 'botLlmText',
  BotLlmStarted = 'botLlmStarted',
  BotLlmStopped = 'botLlmStopped',
  LLMFunctionCall = 'llmFunctionCall',
  BotLlmSearchResponse = 'botLlmSearchResponse',
  BotTtsText = 'botTtsText',
  BotTtsStarted = 'botTtsStarted',
  BotTtsStopped = 'botTtsStopped',
  /** participant events */
  ParticipantConnected = 'participantConnected',
  ParticipantLeft = 'participantLeft',
  /** media events */
  TrackStarted = 'trackStarted',
  TrackStopped = 'trackStopped',
  ScreenTrackStarted = 'screenTrackStarted',
  ScreenTrackStopped = 'screenTrackStopped',
  ScreenShareError = 'screenShareError',
  LocalAudioLevel = 'localAudioLevel',
  RemoteAudioLevel = 'remoteAudioLevel',
  /** media device events */
  AvailableCamsUpdated = 'availableCamsUpdated',
  AvailableMicsUpdated = 'availableMicsUpdated',
  AvailableSpeakersUpdated = 'availableSpeakersUpdated',
  CamUpdated = 'camUpdated',
  MicUpdated = 'micUpdated',
  SpeakerUpdated = 'speakerUpdated',
  DeviceError = 'deviceError',
}
export type RTVIEvents = Partial<{
  /** local connection state events */
  connected: () => void;
  disconnected: () => void;
  transportStateChanged: (state: TransportState) => void;
  /** remote connection state events */
  botConnected: (participant: Participant) => void;
  botReady: (botData: BotReadyData) => void;
  botDisconnected: (participant: Participant) => void;
  error: (message: RTVIMessage) => void;
  /** server messaging */
  serverMessage: (data: any) => void;
  serverResponse: (data: any) => void;
  messageError: (message: RTVIMessage) => void;
  /** service events */
  metrics: (data: PipecatMetricsData) => void;
  botStartedSpeaking: () => void;
  botStoppedSpeaking: () => void;
  userStartedSpeaking: () => void;
  userStoppedSpeaking: () => void;
  userTranscript: (data: TranscriptData) => void;
  botTranscript: (data: BotLLMTextData) => void;
  botLlmText: (data: BotLLMTextData) => void;
  botLlmStarted: () => void;
  botLlmStopped: () => void;
  llmFunctionCall: (func: LLMFunctionCallData) => void;
  botLlmSearchResponse: (data: BotLLMSearchResponseData) => void;
  botTtsText: (data: BotTTSTextData) => void;
  botTtsStarted: () => void;
  botTtsStopped: () => void;
  /** participant events */
  participantConnected: (participant: Participant) => void;
  participantLeft: (participant: Participant) => void;
  /** media events */
  trackStarted: (track: MediaStreamTrack, participant?: Participant) => void;
  trackStopped: (track: MediaStreamTrack, participant?: Participant) => void;
  screenTrackStarted: (track: MediaStreamTrack, p?: Participant) => void;
  screenTrackStopped: (track: MediaStreamTrack, p?: Participant) => void;
  screenShareError: (errorMessage: string) => void;
  localAudioLevel: (level: number) => void;
  remoteAudioLevel: (level: number, p: Participant) => void;
  /** media device events */
  availableCamsUpdated: (cams: MediaDeviceInfo[]) => void;
  availableMicsUpdated: (mics: MediaDeviceInfo[]) => void;
  availableSpeakersUpdated: (speakers: MediaDeviceInfo[]) => void;
  camUpdated: (cam: MediaDeviceInfo) => void;
  micUpdated: (mic: MediaDeviceInfo) => void;
  speakerUpdated: (speaker: MediaDeviceInfo) => void;
  deviceError: (error: DeviceError) => void;
}>;
export type RTVIEventHandler<E extends RTVIEvent> = E extends keyof RTVIEvents
  ? RTVIEvents[E]
  : never;
/**
 * Copyright (c) 2024, Daily.
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}
declare class Logger {
  private constructor();
  static getInstance(): Logger;
  setLevel(level: LogLevel): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}
export const logger: Logger = Logger.getInstance();
export type ILogger = Logger;
interface QueuedRTVIMessage {
  message: RTVIMessage;
  timestamp: number;
  timeout: number;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}
export class MessageDispatcher {
  protected _sendMethod: (message: RTVIMessage) => void;
  protected _queue: QueuedRTVIMessage[];
  protected _gcInterval: ReturnType<typeof setInterval> | undefined;
  constructor(sendMethod: (message: RTVIMessage) => void);
  disconnect(): void;
  dispatch(
    message_data: unknown,
    type?: RTVIMessageType,
    timeout?: number
  ): Promise<RTVIMessage>;
  clearQueue(): void;
  resolve(message: RTVIMessage): RTVIMessage;
  reject(message: RTVIMessage): RTVIMessage;
  protected _gc(): void;
}
type Serializable =
  | string
  | number
  | boolean
  | null
  | Serializable[]
  | {
      [key: number | string]: Serializable;
    };
interface APIRequest {
  endpoint: string | URL | globalThis.Request;
  headers?: Headers;
  requestData?: Serializable;
  timeout?: number;
}
/**
 * @deprecated Use APIRequest instead
 */
type ConnectionEndpoint = APIRequest;
export type Tracks = {
  local: {
    audio?: MediaStreamTrack;
    video?: MediaStreamTrack;
    screenAudio?: MediaStreamTrack;
    screenVideo?: MediaStreamTrack;
  };
  bot?: {
    audio?: MediaStreamTrack;
    screenAudio?: undefined;
    screenVideo?: undefined;
    video?: MediaStreamTrack;
  };
};
export type TransportConnectionParams = unknown;
export abstract class Transport {
  protected _options: PipecatClientOptions;
  protected _onMessage: (ev: RTVIMessage) => void;
  protected _callbacks: RTVIEventCallbacks;
  protected _abortController: AbortController | undefined;
  protected _state: TransportState;
  constructor();
  /** called from PipecatClient constructor to wire up callbacks */
  abstract initialize(
    options: PipecatClientOptions,
    messageHandler: (ev: RTVIMessage) => void
  ): void;
  /**
   * This method is intended to initialize cam/mic devices. It is wrapped
   * by PipecatClient.initDevices and should not be called directly. It is also
   * called as part of PipecatClient.connect if it has not already called.
   */
  abstract initDevices(): Promise<void>;
  /**
   * Establishes a connection with the remote server. This is the main entry
   * point for the transport to start sending and receiving media and messages.
   * This is called from PipecatClient.connect() and should not be called directly.
   * @param connectParams - This type will ultimately be defned by the transport
   * implementation. It is used to pass connection parameters to the transport.
   */
  connect(connectParams?: TransportConnectionParams): Promise<void>;
  abstract _validateConnectionParams(connectParams?: unknown): unknown;
  abstract _connect(connectParams?: TransportConnectionParams): Promise<void>;
  /**
   * Disconnects the transport from the remote server. This is called from
   * PipecatClient.disconnect() and should not be called directly.
   */
  disconnect(): Promise<void>;
  abstract _disconnect(): Promise<void>;
  abstract sendReadyMessage(): void;
  abstract get state(): TransportState;
  abstract set state(state: TransportState);
  abstract getAllMics(): Promise<MediaDeviceInfo[]>;
  abstract getAllCams(): Promise<MediaDeviceInfo[]>;
  abstract getAllSpeakers(): Promise<MediaDeviceInfo[]>;
  abstract updateMic(micId: string): void;
  abstract updateCam(camId: string): void;
  abstract updateSpeaker(speakerId: string): void;
  abstract get selectedMic(): MediaDeviceInfo | Record<string, never>;
  abstract get selectedCam(): MediaDeviceInfo | Record<string, never>;
  abstract get selectedSpeaker(): MediaDeviceInfo | Record<string, never>;
  abstract enableMic(enable: boolean): void;
  abstract enableCam(enable: boolean): void;
  abstract enableScreenShare(enable: boolean): void;
  abstract get isCamEnabled(): boolean;
  abstract get isMicEnabled(): boolean;
  abstract get isSharingScreen(): boolean;
  abstract sendMessage(message: RTVIMessage): void;
  abstract tracks(): Tracks;
}
export class TransportWrapper {
  constructor(transport: Transport);
  get proxy(): Transport;
}
export type FunctionCallParams = {
  functionName: string;
  arguments: Record<string, unknown>;
};
export type FunctionCallCallback = (
  fn: FunctionCallParams
) => Promise<LLMFunctionCallResult | void>;
export type RTVIEventCallbacks = Partial<{
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (message: RTVIMessage) => void;
  onTransportStateChanged: (state: TransportState) => void;
  onBotConnected: (participant: Participant) => void;
  onBotReady: (botReadyData: BotReadyData) => void;
  onBotDisconnected: (participant: Participant) => void;
  onMetrics: (data: PipecatMetricsData) => void;
  onServerMessage: (data: any) => void;
  onMessageError: (message: RTVIMessage) => void;
  onParticipantJoined: (participant: Participant) => void;
  onParticipantLeft: (participant: Participant) => void;
  onAvailableCamsUpdated: (cams: MediaDeviceInfo[]) => void;
  onAvailableMicsUpdated: (mics: MediaDeviceInfo[]) => void;
  onAvailableSpeakersUpdated: (speakers: MediaDeviceInfo[]) => void;
  onCamUpdated: (cam: MediaDeviceInfo) => void;
  onMicUpdated: (mic: MediaDeviceInfo) => void;
  onSpeakerUpdated: (speaker: MediaDeviceInfo) => void;
  onDeviceError: (error: DeviceError) => void;
  onTrackStarted: (track: MediaStreamTrack, participant?: Participant) => void;
  onTrackStopped: (track: MediaStreamTrack, participant?: Participant) => void;
  onScreenTrackStarted: (
    track: MediaStreamTrack,
    participant?: Participant
  ) => void;
  onScreenTrackStopped: (
    track: MediaStreamTrack,
    participant?: Participant
  ) => void;
  onScreenShareError: (errorMessage: string) => void;
  onLocalAudioLevel: (level: number) => void;
  onRemoteAudioLevel: (level: number, participant: Participant) => void;
  onBotStartedSpeaking: () => void;
  onBotStoppedSpeaking: () => void;
  onUserStartedSpeaking: () => void;
  onUserStoppedSpeaking: () => void;
  onUserTranscript: (data: TranscriptData) => void;
  onBotTranscript: (data: BotLLMTextData) => void;
  onBotLlmText: (data: BotLLMTextData) => void;
  onBotLlmStarted: () => void;
  onBotLlmStopped: () => void;
  onBotTtsText: (data: BotTTSTextData) => void;
  onBotTtsStarted: () => void;
  onBotTtsStopped: () => void;
  onBotLlmSearchResponse: (data: BotLLMSearchResponseData) => void;
}>;
export interface PipecatClientOptions {
  /**
   * Transport class for media streaming
   */
  transport: Transport;
  /**
   * Optional callback methods for RTVI events
   */
  callbacks?: RTVIEventCallbacks;
  /**
   * Enable user mic input
   *
   * Default to true
   */
  enableMic?: boolean;
  /**
   * Enable user cam input
   *
   * Default to false
   */
  enableCam?: boolean;
  /**
   * Enable screen sharing
   *
   * Default to false
   */
  enableScreenShare?: boolean;
}
declare const RTVIEventEmitter_base: new () => TypedEmitter<RTVIEvents>;
declare abstract class RTVIEventEmitter extends RTVIEventEmitter_base {}
export class PipecatClient extends RTVIEventEmitter {
  protected _options: PipecatClientOptions;
  protected _transport: Transport;
  protected _transportWrapper: TransportWrapper;
  protected _messageDispatcher: MessageDispatcher;
  protected _functionCallCallbacks: Record<string, FunctionCallCallback>;
  protected _abortController: AbortController | undefined;
  constructor(options: PipecatClientOptions);
  setLogLevel(level: LogLevel): void;
  /**
   * Initialize local media devices
   */
  initDevices(): Promise<void>;
  /**
   * startBot() is a method that initiates the bot by posting to a specified endpoint
   * that optionally returns connection parameters for establishing a transport session.
   * @param startBotParams
   * @returns Promise that resolves to TransportConnectionParams or unknown
   */
  startBot(startBotParams: APIRequest): Promise<unknown>;
  /**
   * The `connect` function establishes a transport session and awaits a
   * bot-ready signal, handling various connection states and errors.
   * @param {TransportConnectionParams} [connectParams] -
   * The `connectParams` parameter in the `connect` method should be of type
   * `TransportConnectionParams`. This parameter is passed to the transport
   * for establishing a transport session.
   * NOTE: `connectParams` as type `ConnectionEndpoint` IS NOW DEPRECATED. If you
   * want to authenticate and connect to a bot in one step, use
   * `startBotAndConnect()` instead.
   * @returns The `connect` method returns a Promise that resolves to an unknown value.
   */
  connect(
    connectParams?: TransportConnectionParams | ConnectionEndpoint
  ): Promise<BotReadyData>;
  startBotAndConnect(startBotParams: APIRequest): Promise<BotReadyData>;
  /**
   * Disconnect the voice client from the transport
   * Reset / reinitialize transport and abort any pending requests
   */
  disconnect(): Promise<void>;
  /**
   * Get the current state of the transport
   */
  get connected(): boolean;
  get transport(): Transport;
  get state(): TransportState;
  get version(): string;
  getAllMics(): Promise<MediaDeviceInfo[]>;
  getAllCams(): Promise<MediaDeviceInfo[]>;
  getAllSpeakers(): Promise<MediaDeviceInfo[]>;
  get selectedMic(): MediaDeviceInfo | Record<string, never>;
  get selectedCam(): MediaDeviceInfo | Record<string, never>;
  get selectedSpeaker(): MediaDeviceInfo | Record<string, never>;
  updateMic(micId: string): void;
  updateCam(camId: string): void;
  updateSpeaker(speakerId: string): void;
  enableMic(enable: boolean): void;
  get isMicEnabled(): boolean;
  enableCam(enable: boolean): void;
  get isCamEnabled(): boolean;
  tracks(): Tracks;
  enableScreenShare(enable: boolean): void;
  get isSharingScreen(): boolean;
  /**
   * Directly send a message to the bot via the transport.
   * Do not await a response.
   * @param msgType - a string representing the message type
   * @param data - a dictionary of data to send with the message
   */
  sendClientMessage(msgType: string, data?: unknown): void;
  /**
   * Directly send a message to the bot via the transport.
   * Wait for and return the response.
   * @param msgType - a string representing the message type
   * @param data - a dictionary of data to send with the message
   * @param timeout - optional timeout in milliseconds for the response
   */
  sendClientRequest(
    msgType: string,
    data: unknown,
    timeout?: number
  ): Promise<unknown>;
  registerFunctionCallHandler(
    functionName: string,
    callback: FunctionCallCallback
  ): void;
  appendToContext(context: LLMContextMessage): Promise<boolean>;
  /**
   * Disconnects the bot, but keeps the session alive
   */
  disconnectBot(): void;
  protected handleMessage(ev: RTVIMessage): void;
}

//# sourceMappingURL=index.d.ts.map
