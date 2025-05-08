import {
  MediaDeviceInfo,
  MediaStreamTrack,
} from '@daily-co/react-native-webrtc';
import TypedEmitter from 'typed-emitter';
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
export class ConfigUpdateError extends RTVIError {
  readonly status = 400;
  constructor(message?: string | undefined);
}
export type RTVIClientHelpers = Partial<Record<string, RTVIClientHelper>>;
export type RTVIClientHelperCallbacks = Partial<object>;
export interface RTVIClientHelperOptions {
  /**
   * Callback methods for events / messages
   */
  callbacks?: RTVIClientHelperCallbacks;
}
export abstract class RTVIClientHelper {
  protected _options: RTVIClientHelperOptions;
  protected _client: RTVIClient;
  protected _service: string;
  constructor(options: RTVIClientHelperOptions);
  abstract handleMessage(ev: RTVIMessage): void;
  abstract getMessageTypes(): string[];
  set client(client: RTVIClient);
  set service(service: string);
}
export type LLMFunctionCallData = {
  function_name: string;
  tool_call_id: string;
  args: unknown;
  result?: unknown;
};
export type LLMContextMessage = {
  role: string;
  content: unknown;
};
export type LLMContext = Partial<{
  messages?: LLMContextMessage[];
  tools?: [];
}>;
export type FunctionCallParams = {
  functionName: string;
  arguments: unknown;
};
export type FunctionCallCallback = (fn: FunctionCallParams) => Promise<unknown>;
export enum LLMMessageType {
  LLM_FUNCTION_CALL = 'llm-function-call',
  LLM_FUNCTION_CALL_START = 'llm-function-call-start',
  LLM_FUNCTION_CALL_RESULT = 'llm-function-call-result',
  LLM_JSON_COMPLETION = 'llm-json-completion',
}
export type LLMHelperCallbacks = Partial<{
  onLLMJsonCompletion: (jsonString: string) => void;
  onLLMFunctionCall: (func: LLMFunctionCallData) => void;
  onLLMFunctionCallStart: (functionName: string) => void;
  onLLMMessage: (message: LLMContextMessage) => void;
}>;
export interface LLMHelperOptions extends RTVIClientHelperOptions {
  callbacks?: LLMHelperCallbacks;
}
export class LLMHelper extends RTVIClientHelper {
  protected _options: LLMHelperOptions;
  constructor(options: LLMHelperOptions);
  getMessageTypes(): string[];
  /**
   * Retrieve the bot's current LLM context.
   * @returns Promise<LLMContext>
   */
  getContext(): Promise<LLMContext>;
  /**
   * Update the bot's LLM context.
   * If this is called while the transport is not in the ready state, the local context will be updated
   * @param context LLMContext - The new context
   * @param interrupt boolean - Whether to interrupt the bot, or wait until it has finished speaking
   * @returns Promise<boolean>
   */
  setContext(context: LLMContext, interrupt?: boolean): Promise<boolean>;
  /**
   * Append a new message to the LLM context.
   * If this is called while the transport is not in the ready state, the local context will be updated
   * @param context LLMContextMessage
   * @param runImmediately boolean - wait until pipeline is idle before running
   * @returns boolean
   */
  appendToMessages(
    context: LLMContextMessage,
    runImmediately?: boolean
  ): Promise<boolean>;
  /**
   * Run the bot's current LLM context.
   * Useful when appending messages to the context without runImmediately set to true.
   * Will do nothing if the bot is not in the ready state.
   * @param interrupt boolean - Whether to interrupt the bot, or wait until it has finished speaking
   * @returns Promise<unknown>
   */
  run(interrupt?: boolean): Promise<unknown>;
  /**
   * If the LLM wants to call a function, RTVI will invoke the callback defined
   * here. Whatever the callback returns will be sent to the LLM as the function result.
   * @param callback
   * @returns void
   */
  handleFunctionCall(callback: FunctionCallCallback): void;
  handleMessage(ev: RTVIMessage): void;
}
export type TransportState =
  | 'disconnected'
  | 'initializing'
  | 'initialized'
  | 'authenticating'
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'disconnecting'
  | 'error';
export type Participant = {
  id: string;
  name: string;
  local: boolean;
};
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
export abstract class Transport {
  protected _options: RTVIClientOptions;
  protected _onMessage: (ev: RTVIMessage) => void;
  protected _callbacks: RTVIEventCallbacks;
  protected _state: TransportState;
  protected _expiry?: number;
  constructor();
  abstract initialize(
    options: RTVIClientOptions,
    messageHandler: (ev: RTVIMessage) => void
  ): void;
  abstract initDevices(): Promise<void>;
  abstract connect(
    authBundle: unknown,
    abortController: AbortController
  ): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendReadyMessage(): void;
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
  abstract get state(): TransportState;
  abstract set state(state: TransportState);
  get expiry(): number | undefined;
  abstract tracks(): Tracks;
}
export enum RTVIEvent {
  MessageError = 'messageError',
  Error = 'error',
  Connected = 'connected',
  Disconnected = 'disconnected',
  TransportStateChanged = 'transportStateChanged',
  Config = 'config',
  ConfigDescribe = 'configDescribe',
  ActionsAvailable = 'actionsAvailable',
  ParticipantConnected = 'participantConnected',
  ParticipantLeft = 'participantLeft',
  TrackStarted = 'trackStarted',
  TrackStopped = 'trackStopped',
  ScreenTrackStarted = 'screenTrackStarted',
  ScreenTrackStopped = 'screenTrackStopped',
  ScreenShareError = 'screenShareError',
  AvailableCamsUpdated = 'availableCamsUpdated',
  AvailableMicsUpdated = 'availableMicsUpdated',
  AvailableSpeakersUpdated = 'availableSpeakersUpdated',
  CamUpdated = 'camUpdated',
  MicUpdated = 'micUpdated',
  SpeakerUpdated = 'speakerUpdated',
  BotConnected = 'botConnected',
  BotReady = 'botReady',
  BotDisconnected = 'botDisconnected',
  BotStartedSpeaking = 'botStartedSpeaking',
  BotStoppedSpeaking = 'botStoppedSpeaking',
  RemoteAudioLevel = 'remoteAudioLevel',
  UserStartedSpeaking = 'userStartedSpeaking',
  UserStoppedSpeaking = 'userStoppedSpeaking',
  LocalAudioLevel = 'localAudioLevel',
  Metrics = 'metrics',
  UserTranscript = 'userTranscript',
  BotTranscript = 'botTranscript',
  BotLlmText = 'botLlmText',
  BotLlmStarted = 'botLlmStarted',
  BotLlmStopped = 'botLlmStopped',
  BotTtsText = 'botTtsText',
  BotTtsStarted = 'botTtsStarted',
  BotTtsStopped = 'botTtsStopped',
  LLMFunctionCall = 'llmFunctionCall',
  LLMFunctionCallStart = 'llmFunctionCallStart',
  LLMJsonCompletion = 'llmJsonCompletion',
  StorageItemStored = 'storageItemStored',
}
export type RTVIEvents = Partial<{
  connected: () => void;
  disconnected: () => void;
  transportStateChanged: (state: TransportState) => void;
  config: (config: RTVIClientConfigOption[]) => void;
  configUpdated: (config: RTVIClientConfigOption[]) => void;
  configDescribe: (configDescription: unknown) => void;
  actionsAvailable: (actions: unknown) => void;
  participantConnected: (participant: Participant) => void;
  participantLeft: (participant: Participant) => void;
  trackStarted: (track: MediaStreamTrack, participant?: Participant) => void;
  trackStopped: (track: MediaStreamTrack, participant?: Participant) => void;
  screenTrackStarted: (track: MediaStreamTrack, p?: Participant) => void;
  screenTrackStopped: (track: MediaStreamTrack, p?: Participant) => void;
  screenShareError: (errorMessage: string) => void;
  availableCamsUpdated: (cams: MediaDeviceInfo[]) => void;
  availableMicsUpdated: (mics: MediaDeviceInfo[]) => void;
  availableSpeakersUpdated: (speakers: MediaDeviceInfo[]) => void;
  camUpdated: (cam: MediaDeviceInfo) => void;
  micUpdated: (mic: MediaDeviceInfo) => void;
  speakerUpdated: (speaker: MediaDeviceInfo) => void;
  botReady: (botData: BotReadyData) => void;
  botConnected: (participant: Participant) => void;
  botDisconnected: (participant: Participant) => void;
  botStartedSpeaking: () => void;
  botStoppedSpeaking: () => void;
  remoteAudioLevel: (level: number, p: Participant) => void;
  userStartedSpeaking: () => void;
  userStoppedSpeaking: () => void;
  localAudioLevel: (level: number) => void;
  metrics: (data: PipecatMetricsData) => void;
  userTranscript: (data: TranscriptData) => void;
  botTranscript: (data: BotLLMTextData) => void;
  botLlmText: (data: BotLLMTextData) => void;
  botLlmStarted: () => void;
  botLlmStopped: () => void;
  botTtsText: (data: BotTTSTextData) => void;
  botTtsStarted: () => void;
  botTtsStopped: () => void;
  error: (message: RTVIMessage) => void;
  messageError: (message: RTVIMessage) => void;
  llmFunctionCall: (func: LLMFunctionCallData) => void;
  llmFunctionCallStart: (functionName: string) => void;
  llmJsonCompletion: (data: string) => void;
  storageItemStored: (data: StorageItemStoredData) => void;
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
export type ILogger = Logger;
export type ConfigOption = {
  name: string;
  value: unknown;
};
export type RTVIClientConfigOption = {
  service: string;
  options: ConfigOption[];
};
export type RTVIURLEndpoints = 'connect' | 'action';
export type RTVIClientParams = {
  baseUrl?: string | null;
} & Partial<{
  headers?: Headers;
  endpoints: Record<RTVIURLEndpoints, string | null>;
  requestData?: object;
  config?: RTVIClientConfigOption[];
}> & {
    [key: string]: unknown;
  };
export interface RTVIClientOptions {
  /**
   * Parameters passed as JSON stringified body params to all endpoints (e.g. connect)
   */
  params: RTVIClientParams;
  /**
   * Transport class for media streaming
   */
  transport: Transport;
  /**
   * Optional callback methods for RTVI events
   */
  callbacks?: RTVIEventCallbacks;
  /**
   * Handshake timeout
   *
   * How long should the client wait for the bot ready event (when authenticating / requesting an agent)
   * Defaults to no timeout (undefined)
   */
  timeout?: number;
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
   * Custom start method handler for retrieving auth bundle for transport
   * @param baseUrl
   * @param params
   * @param timeout
   * @param abortController
   * @returns Promise<void>
   */
  customConnectHandler?: (
    params: RTVIClientParams,
    timeout: ReturnType<typeof setTimeout> | undefined,
    abortController: AbortController
  ) => Promise<void>;
  /**
   * Base URL for auth handlers and transport services
   *
   * Defaults to a POST request with a the config object as the body
   * @deprecated Use params.baseUrl instead
   */
  baseUrl?: string;
  /**
   * Service key value pairs (e.g. {llm: "openai"} )
   * @deprecated Use params.services instead
   */
  services?: VoiceClientServices;
  /**
   * Service configuration options for services and further customization
   * @deprecated Use params.config instead
   */
  config?: VoiceClientConfigOption[];
  /**
   * Custom HTTP headers to be send with the POST request to baseUrl
   * @deprecated Use startHeaders instead
   */
  customHeaders?: {
    [key: string]: string;
  };
  /**
   * Custom request parameters to send with the POST request to baseUrl
   * @deprecated Use params instead
   */
  customBodyParams?: object;
}
export type RTVIEventCallbacks = Partial<{
  onGenericMessage: (data: unknown) => void;
  onMessageError: (message: RTVIMessage) => void;
  onError: (message: RTVIMessage) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onTransportStateChanged: (state: TransportState) => void;
  onConfig: (config: RTVIClientConfigOption[]) => void;
  onConfigDescribe: (configDescription: unknown) => void;
  onActionsAvailable: (actions: unknown) => void;
  onBotConnected: (participant: Participant) => void;
  onBotReady: (botReadyData: BotReadyData) => void;
  onBotDisconnected: (participant: Participant) => void;
  onParticipantJoined: (participant: Participant) => void;
  onParticipantLeft: (participant: Participant) => void;
  onMetrics: (data: PipecatMetricsData) => void;
  onAvailableCamsUpdated: (cams: MediaDeviceInfo[]) => void;
  onAvailableMicsUpdated: (mics: MediaDeviceInfo[]) => void;
  onAvailableSpeakersUpdated: (speakers: MediaDeviceInfo[]) => void;
  onCamUpdated: (cam: MediaDeviceInfo) => void;
  onMicUpdated: (mic: MediaDeviceInfo) => void;
  onSpeakerUpdated: (speaker: MediaDeviceInfo) => void;
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
  onStorageItemStored: (data: StorageItemStoredData) => void;
}>;
declare const RTVIEventEmitter_base: new () => TypedEmitter<RTVIEvents>;
declare abstract class RTVIEventEmitter extends RTVIEventEmitter_base {}
export class RTVIClient extends RTVIEventEmitter {
  params: RTVIClientParams;
  protected _options: RTVIClientOptions;
  protected _transport: Transport;
  protected _messageDispatcher: MessageDispatcher;
  constructor(options: RTVIClientOptions);
  constructUrl(endpoint: RTVIURLEndpoints): string;
  setLogLevel(level: LogLevel): void;
  /**
   * Initialize local media devices
   */
  initDevices(): Promise<void>;
  /**
   * Connect the voice client session with chosen transport
   * Call async (await) to handle errors
   */
  connect(): Promise<unknown>;
  /**
   * Disconnect the voice client from the transport
   * Reset / reinitialize transport and abort any pending requests
   */
  disconnect(): Promise<void>;
  /**
   * Get the current state of the transport
   */
  get connected(): boolean;
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
  /**
   * Request the bot to send the current configuration
   * @returns Promise<RTVIClientConfigOption[]> - Promise that resolves with the bot's configuration
   */
  getConfig(): Promise<RTVIClientConfigOption[]>;
  /**
   * Update pipeline and services
   * @param config - RTVIClientConfigOption[] partial object with the new configuration
   * @param interrupt - boolean flag to interrupt the current pipeline, or wait until the next turn
   * @returns Promise<RTVIMessage> - Promise that resolves with the updated configuration
   */
  updateConfig(
    config: RTVIClientConfigOption[],
    interrupt?: boolean
  ): Promise<RTVIMessage>;
  /**
   * Request bot describe the current configuration options
   * @returns Promise<unknown> - Promise that resolves with the bot's configuration description
   */
  describeConfig(): Promise<unknown>;
  /**
   * Returns configuration options for specified service key
   * @param serviceKey - Service name to get options for (e.g. "llm")
   * @param config? - Optional RTVIClientConfigOption[] to query (vs. using remote config)
   * @returns RTVIClientConfigOption | undefined - Configuration options array for the service with specified key or undefined
   */
  getServiceOptionsFromConfig(
    serviceKey: string,
    config?: RTVIClientConfigOption[]
  ): Promise<RTVIClientConfigOption | undefined>;
  /**
   * Returns configuration option value (unknown) for specified service key and option name
   * @param serviceKey - Service name to get options for (e.g. "llm")
   * @optional option Name of option return from the config (e.g. "model")
   * @returns Promise<unknown | undefined> - Service configuration option value or undefined
   */
  getServiceOptionValueFromConfig(
    serviceKey: string,
    option: string,
    config?: RTVIClientConfigOption[]
  ): Promise<unknown | undefined>;
  /**
   * Returns config with updated option(s) for specified service key and option name
   * Note: does not update current config, only returns a new object (call updateConfig to apply changes)
   * @param serviceKey - Service name to get options for (e.g. "llm")
   * @param option - Service name to get options for (e.g. "model")
   * @param config - Optional RTVIClientConfigOption[] to update (vs. using current config)
   * @returns Promise<RTVIClientConfigOption[] | undefined> - Configuration options array with updated option(s) or undefined
   */
  setServiceOptionInConfig(
    serviceKey: string,
    option: ConfigOption | ConfigOption[],
    config?: RTVIClientConfigOption[]
  ): Promise<RTVIClientConfigOption[] | undefined>;
  /**
   * Returns config object with updated properties from passed array.
   * @param configOptions - Array of RTVIClientConfigOption[] to update
   * @param config? - Optional RTVIClientConfigOption[] to update (vs. using current config)
   * @returns Promise<RTVIClientConfigOption[]> - Configuration options
   */
  setConfigOptions(
    configOptions: RTVIClientConfigOption[],
    config?: RTVIClientConfigOption[]
  ): Promise<RTVIClientConfigOption[]>;
  /**
   * Dispatch an action message to the bot or http single-turn endpoint
   */
  action(action: RTVIActionRequestData): Promise<RTVIActionResponse>;
  /**
   * Describe available / registered actions the bot has
   * @returns Promise<unknown> - Promise that resolves with the bot's actions
   */
  describeActions(): Promise<unknown>;
  /**
   * Get the session expiry time for the transport session (if applicable)
   * @returns number - Expiry time in milliseconds
   */
  get transportExpiry(): number | undefined;
  /**
   * Directly send a message to the bot via the transport
   * @param message - RTVIMessage object to send
   */
  sendMessage(message: RTVIMessage): void;
  /**
   * Disconnects the bot, but keeps the session alive
   */
  disconnectBot(): void;
  protected handleMessage(ev: RTVIMessage): void;
  /**
   * Register a new helper to the client
   * This (optionally) provides a way to reference helpers directly
   * from the client and use the event dispatcher
   * @param service - Target service for this helper
   * @param helper - Helper instance
   * @returns RTVIClientHelper - Registered helper instance
   */
  registerHelper(service: string, helper: RTVIClientHelper): RTVIClientHelper;
  getHelper<T extends RTVIClientHelper>(service: string): T | undefined;
  unregisterHelper(service: string): void;
}
export const RTVI_MESSAGE_LABEL = 'rtvi-ai';
export enum RTVIMessageType {
  CLIENT_READY = 'client-ready',
  UPDATE_CONFIG = 'update-config',
  GET_CONFIG = 'get-config',
  DESCRIBE_CONFIG = 'describe-config',
  DESCRIBE_ACTIONS = 'describe-actions',
  DISCONNECT_BOT = 'disconnect-bot',
  BOT_READY = 'bot-ready', // Bot is connected and ready to receive messages
  ERROR = 'error', // Bot initialization error
  ERROR_RESPONSE = 'error-response', // Error response from the bot in response to an action
  CONFIG = 'config', // Bot configuration
  CONFIG_AVAILABLE = 'config-available', // Configuration options available on the bot
  CONFIG_ERROR = 'config-error', // Configuration options have changed failed
  ACTIONS_AVAILABLE = 'actions-available', // Actions available on the bot
  ACTION_RESPONSE = 'action-response', // Action response from the bot
  METRICS = 'metrics', // RTVI reporting metrics
  USER_TRANSCRIPTION = 'user-transcription', // Local user speech to text transcription (partials and finals)
  BOT_TRANSCRIPTION = 'bot-transcription', // Bot full text transcription (sentence aggregated)
  USER_STARTED_SPEAKING = 'user-started-speaking', // User started speaking
  USER_STOPPED_SPEAKING = 'user-stopped-speaking', // User stopped speaking
  BOT_STARTED_SPEAKING = 'bot-started-speaking', // Bot started speaking
  BOT_STOPPED_SPEAKING = 'bot-stopped-speaking', // Bot stopped speaking
  USER_LLM_TEXT = 'user-llm-text', // Aggregated user input text which is sent to LLM
  BOT_LLM_TEXT = 'bot-llm-text', // Streamed token returned by the LLM
  BOT_LLM_STARTED = 'bot-llm-started', // Bot LLM inference starts
  BOT_LLM_STOPPED = 'bot-llm-stopped', // Bot LLM inference stops
  BOT_TTS_TEXT = 'bot-tts-text', // Bot TTS text output (streamed word as it is spoken)
  BOT_TTS_STARTED = 'bot-tts-started', // Bot TTS response starts
  BOT_TTS_STOPPED = 'bot-tts-stopped', // Bot TTS response stops
  STORAGE_ITEM_STORED = 'storage-item-stored',
}
export type ConfigData = {
  config: RTVIClientConfigOption[];
};
export type BotReadyData = {
  config: RTVIClientConfigOption[];
  version: string;
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
export type StorageItemStoredData = {
  action: string;
  items: unknown;
};
export type RTVIMessageActionResponse = {
  id: string;
  label: string;
  type: string;
  data: {
    result: unknown;
  };
};
export class RTVIMessage {
  id: string;
  label: string;
  type: string;
  data: unknown;
  constructor(type: string, data: unknown, id?: string);
  static clientReady(): RTVIMessage;
  static updateConfig(
    config: RTVIClientConfigOption[],
    interrupt?: boolean
  ): RTVIMessage;
  static describeConfig(): RTVIMessage;
  static getBotConfig(): RTVIMessage;
  static describeActions(): RTVIMessage;
  static disconnectBot(): RTVIMessage;
}
export const RTVI_ACTION_TYPE = 'action';
export type RTVIActionRequestData = {
  service: string;
  action: string;
  arguments?: {
    name: string;
    value: unknown;
  }[];
};
export class RTVIActionRequest extends RTVIMessage {
  constructor(data: RTVIActionRequestData);
}
export type RTVIActionResponse = {
  id: string;
  label: string;
  type: string;
  data: {
    result: unknown;
  };
};
export class MessageDispatcher {
  constructor(client: RTVIClient);
  dispatch(message: RTVIMessage): Promise<RTVIMessage>;
  dispatchAction(
    action: RTVIActionRequest,
    onMessage: (message: RTVIMessage) => void
  ): Promise<RTVIMessageActionResponse>;
  resolve(message: RTVIMessage): RTVIMessage;
  reject(message: RTVIMessage): RTVIMessage;
}
export function httpActionGenerator(
  actionUrl: string,
  action: RTVIActionRequest,
  params: RTVIClientParams,
  handleResponse: (response: RTVIActionResponse) => void
): Promise<void>;
