import Daily, {
  DailyCall,
  DailyCallOptions,
  DailyCameraErrorObject,
  DailyCameraErrorType,
  DailyEventObjectAppMessage,
  DailyEventObjectAvailableDevicesUpdated,
  DailyEventObjectCameraError,
  DailyEventObjectFatalError,
  DailyEventObjectLocalAudioLevel,
  DailyEventObjectNonFatalError,
  DailyEventObjectParticipant,
  DailyEventObjectParticipantLeft,
  DailyEventObjectRemoteParticipantsAudioLevel,
  DailyEventObjectTrack,
  DailyFactoryOptions,
  DailyParticipant,
} from '@daily-co/react-native-daily-js';

import {
  DeviceArray,
  DeviceError,
  Participant,
  PipecatClientOptions,
  RTVIError,
  RTVIEventCallbacks,
  RTVIMessage,
  Tracks,
  Transport,
  TransportStartError,
  TransportState,
  logger,
} from '@pipecat-ai/client-js';
import { MediaDeviceInfo } from '@daily-co/react-native-webrtc';

class DailyCallWrapper {
  private _daily: DailyCall;
  private _proxy: DailyCall;

  constructor(daily: DailyCall) {
    this._daily = daily;
    this._proxy = new Proxy(this._daily, {
      get: (target, prop, receiver) => {
        if (typeof target[prop as keyof DailyCall] === 'function') {
          let errMsg;
          switch (String(prop)) {
            // Disable methods that modify the lifecycle of the call. These operations
            // should be performed via the PipecatClient in order to keep state in sync.
            case 'preAuth':
              errMsg = `Calls to preAuth() are disabled. Please use Transport.preAuth()`;
              break;
            case 'startCamera':
              errMsg = `Calls to startCamera() are disabled. Please use PipecatClient.initDevices()`;
              break;
            case 'join':
              errMsg = `Calls to join() are disabled. Please use PipecatClient.connect()`;
              break;
            case 'leave':
              errMsg = `Calls to leave() are disabled. Please use PipecatClient.disconnect()`;
              break;
            case 'destroy':
              errMsg = `Calls to destroy() are disabled.`;
              break;
          }
          if (errMsg) {
            return () => {
              throw new Error(errMsg);
            };
          }
          // Forward other method calls
          return (...args: any[]) => {
            return (target[prop as keyof DailyCall] as Function)(...args);
          };
        }
        // Forward property access
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  get proxy(): DailyCall {
    return this._proxy;
  }
}

export class RNDailyTransport extends Transport {
  // Not able to use declare fields here
  // opened issue: https://github.com/facebook/create-react-app/issues/8918
  private _dailyWrapper!: DailyCallWrapper;
  private _daily!: DailyCall;
  private _dailyFactoryOptions: DailyFactoryOptions;

  private _botId: string = '';
  private _selectedCam: MediaDeviceInfo | Record<string, never> = {};
  private _selectedMic: MediaDeviceInfo | Record<string, never> = {};
  private _selectedSpeaker: MediaDeviceInfo | Record<string, never> = {};

  constructor(opts: DailyFactoryOptions = {}) {
    super();
    this._callbacks = {} as RTVIEventCallbacks;
    this._dailyFactoryOptions = opts;
    this._daily = Daily.createCallObject({
      ...this._dailyFactoryOptions,
      allowMultipleCallInstances: true,
    });
    this._dailyWrapper = new DailyCallWrapper(this._daily);
  }

  public initialize(
    options: PipecatClientOptions,
    messageHandler: (ev: RTVIMessage) => void
  ): void {
    this._callbacks = (options.callbacks ?? {}) as RTVIEventCallbacks;
    this._onMessage = messageHandler;

    if (
      this._dailyFactoryOptions.startVideoOff == null ||
      options.enableCam != null
    ) {
      // Default is cam off
      this._dailyFactoryOptions.startVideoOff = !(options.enableCam ?? false);
    }
    if (
      this._dailyFactoryOptions.startAudioOff == null ||
      options.enableMic != null
    ) {
      // Default is mic on
      this._dailyFactoryOptions.startAudioOff = !(options.enableMic ?? true);
    }

    this.attachEventListeners();

    this.state = 'disconnected';

    logger.debug('[Daily Transport] Initialized');
  }

  get dailyCallClient(): DailyCall {
    return this._dailyWrapper.proxy;
  }

  get state(): TransportState {
    return this._state;
  }

  private set state(state: TransportState) {
    if (this._state === state) return;

    this._state = state;
    this._callbacks.onTransportStateChanged?.(state);
  }

  getSessionInfo() {
    return this._daily.meetingSessionSummary();
  }

  async getAllCams() {
    const { devices } = await this._daily.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput') as MediaDeviceInfo[];
  }

  updateCam(camId: string) {
    this._daily.setCamera(camId).then(async () => {
      let inputDevices = await this._daily.getInputDevices();
      this._selectedCam = inputDevices.camera as MediaDeviceInfo;
    });
  }

  get selectedCam() {
    return this._selectedCam;
  }

  async getAllMics() {
    const { devices } = await this._daily.enumerateDevices();
    return devices.filter((d) => d.kind === 'audio') as MediaDeviceInfo[];
  }

  updateMic(micId: string) {
    this._daily.setAudioDevice(micId).then(async () => {
      let inputDevices = await this._daily.getInputDevices();
      this._selectedMic = inputDevices.mic as MediaDeviceInfo;
    });
  }

  get selectedMic() {
    return this._selectedMic;
  }

  async getAllSpeakers() {
    const { devices } = await this._daily.enumerateDevices();
    return devices.filter((d) => d.kind === 'audio');
  }

  updateSpeaker(speakerId: string) {
    this._daily?.setAudioDevice(speakerId).then(async () => {
      const devicesInUse = await this._daily.getInputDevices();
      this._selectedSpeaker = devicesInUse?.speaker;
    });
  }

  get selectedSpeaker() {
    return this._selectedSpeaker;
  }

  enableMic(enable: boolean) {
    this._daily.setLocalAudio(enable);
  }

  get isMicEnabled() {
    return this._daily.localAudio();
  }

  enableCam(enable: boolean) {
    this._daily.setLocalVideo(enable);
  }

  get isCamEnabled() {
    return this._daily.localVideo();
  }

  public enableScreenShare(enable: boolean) {
    if (enable) {
      this._daily.startScreenShare();
    } else {
      this._daily.stopScreenShare();
    }
  }

  public get isSharingScreen(): boolean {
    return this._daily.localScreenAudio() || this._daily.localScreenVideo();
  }

  tracks() {
    const participants = this._daily.participants() ?? {};
    const bot = participants?.[this._botId];

    const tracks: Tracks = {
      local: {
        audio: participants?.local?.tracks?.audio?.persistentTrack,
        screenAudio: participants?.local?.tracks?.screenAudio?.persistentTrack,
        screenVideo: participants?.local?.tracks?.screenVideo?.persistentTrack,
        video: participants?.local?.tracks?.video?.persistentTrack,
      },
    };

    if (bot) {
      tracks.bot = {
        audio: bot?.tracks?.audio?.persistentTrack,
        video: bot?.tracks?.video?.persistentTrack,
      };
    }

    return tracks;
  }

  async preAuth(dailyCallOptions: DailyCallOptions) {
    this._dailyFactoryOptions = dailyCallOptions;
    await this._daily.preAuth(dailyCallOptions);
  }

  async initDevices() {
    if (!this._daily) {
      throw new RTVIError('Transport instance not initialized');
    }

    this.state = 'initializing';
    await this._daily.startCamera();
    const { devices } = await this._daily.enumerateDevices();
    const cams = devices.filter((d) => d.kind === 'videoinput');
    const mics = devices.filter((d) => d.kind === 'audio');

    this._callbacks.onAvailableCamsUpdated?.(cams);
    this._callbacks.onAvailableMicsUpdated?.(mics);

    let inputDevices = await this._daily.getInputDevices();
    this._selectedCam = inputDevices.camera;
    this._callbacks.onCamUpdated?.(this._selectedCam as MediaDeviceInfo);
    this._selectedMic = inputDevices.mic;
    this._callbacks.onMicUpdated?.(this._selectedMic as MediaDeviceInfo);

    // Instantiate audio observers
    if (!this._daily.isLocalAudioLevelObserverRunning())
      await this._daily.startLocalAudioLevelObserver(100);
    if (!this._daily.isRemoteParticipantsAudioLevelObserverRunning())
      await this._daily.startRemoteParticipantsAudioLevelObserver(100);

    this.state = 'initialized';
  }

  _validateConnectionParams(
    connectParams?: unknown
  ): DailyCallOptions | undefined {
    if (connectParams === undefined || connectParams === null) {
      return undefined;
    }
    if (typeof connectParams !== 'object') {
      throw new RTVIError('Invalid connection parameters');
    }
    type DailyConnectParams = DailyCallOptions & {
      room_url?: string;
      dailyRoom?: string; // for compatibility with old PipecatCloud versions
      dailyToken?: string; // for compatibility with old PipecatCloud versions
    };
    const tmpParams = connectParams as DailyConnectParams;
    if (tmpParams.room_url) {
      tmpParams.url = tmpParams.room_url;
      delete tmpParams.room_url;
    } else if (tmpParams.dailyRoom) {
      tmpParams.url = tmpParams.dailyRoom;
      delete tmpParams.dailyRoom;
    }
    if (tmpParams.dailyToken) {
      tmpParams.token = tmpParams.dailyToken;
      delete tmpParams.dailyToken;
    }
    if (!tmpParams.token) {
      // Daily doesn't like token being in the map and undefined or null
      delete tmpParams.token;
    }
    return tmpParams as DailyCallOptions;
  }

  async _connect(connectParams?: DailyCallOptions) {
    if (!this._daily) {
      throw new RTVIError('Transport instance not initialized');
    }

    if (connectParams) {
      this._dailyFactoryOptions = {
        ...this._dailyFactoryOptions,
        ...connectParams,
      };
    }

    this.state = 'connecting';

    try {
      await this._daily.join(this._dailyFactoryOptions);
    } catch (e) {
      logger.error('Failed to join room', e);
      this.state = 'error';
      throw new TransportStartError();
    }

    if (this._abortController?.signal.aborted) return;

    this.state = 'connected';

    this._callbacks.onConnected?.();
  }

  async sendReadyMessage(): Promise<void> {
    return new Promise<void>((resolve) => {
      (async () => {
        this._daily.on('track-started', (ev) => {
          if (!ev.participant?.local) {
            this.state = 'ready';
            this.sendMessage(RTVIMessage.clientReady());
            resolve();
          }
        });
      })();
    });
  }

  private attachEventListeners() {
    this._daily.on(
      'available-devices-updated',
      this.handleAvailableDevicesUpdated.bind(this)
    );

    this._daily.on(
      // TODO, we need to add DailyEventObjectSelectedDevicesUpdated to types overrides inside react-ntive-daily-js
      // @ts-ignore
      'selected-devices-updated',
      this.handleSelectedDevicesUpdated.bind(this)
    );
    this._daily.on('camera-error', this.handleDeviceError.bind(this));

    this._daily.on('track-started', this.handleTrackStarted.bind(this));
    this._daily.on('track-stopped', this.handleTrackStopped.bind(this));
    this._daily.on(
      'participant-joined',
      this.handleParticipantJoined.bind(this)
    );
    this._daily.on('participant-left', this.handleParticipantLeft.bind(this));
    this._daily.on('local-audio-level', this.handleLocalAudioLevel.bind(this));
    this._daily.on(
      'remote-participants-audio-level',
      this.handleRemoteAudioLevel.bind(this)
    );
    this._daily.on('app-message', this.handleAppMessage.bind(this));
    this._daily.on('left-meeting', this.handleLeftMeeting.bind(this));
    this._daily.on('error', this.handleFatalError.bind(this));
    this._daily.on('nonfatal-error', this.handleNonFatalError.bind(this));
  }

  async _disconnect() {
    this.state = 'disconnecting';
    this._daily.stopLocalAudioLevelObserver();
    this._daily.stopRemoteParticipantsAudioLevelObserver();
    await this._daily.leave();
  }

  public sendMessage(message: RTVIMessage) {
    this._daily.sendAppMessage(message, '*');
  }

  private handleAppMessage(ev: DailyEventObjectAppMessage) {
    // Bubble any messages with rtvi-ai label
    if (ev.data.label === 'rtvi-ai') {
      this._onMessage({
        id: ev.data.id,
        type: ev.data.type,
        data: ev.data.data,
      } as RTVIMessage);
    }
  }

  private handleAvailableDevicesUpdated(
    ev: DailyEventObjectAvailableDevicesUpdated
  ) {
    this._callbacks.onAvailableCamsUpdated?.(
      ev.availableDevices.filter((d) => d.kind === 'videoinput')
    );
    this._callbacks.onAvailableMicsUpdated?.(
      ev.availableDevices.filter((d) => d.kind === 'audio')
    );
    this._callbacks.onAvailableSpeakersUpdated?.(
      ev.availableDevices.filter((d) => d.kind === 'audio')
    );
  }

  // TODO, we need to add DailyEventObjectSelectedDevicesUpdated to types overrides inside react-ntive-daily-js
  private handleSelectedDevicesUpdated(
    // @ts-ignore
    ev: DailyEventObjectSelectedDevicesUpdated
  ) {
    if (this._selectedCam?.deviceId !== ev.devices.camera) {
      this._selectedCam = ev.devices.camera;
      this._callbacks.onCamUpdated?.(ev.devices.camera as MediaDeviceInfo);
    }
    if (this._selectedMic?.deviceId !== ev.devices.mic) {
      this._selectedMic = ev.devices.mic;
      this._callbacks.onMicUpdated?.(ev.devices.mic as MediaDeviceInfo);
    }
    if (this._selectedSpeaker?.deviceId !== ev.devices.speaker) {
      this._selectedSpeaker = ev.devices.speaker;
      this._callbacks.onSpeakerUpdated?.(ev.devices.speaker as MediaDeviceInfo);
    }
  }

  private handleDeviceError(ev: DailyEventObjectCameraError) {
    const generateDeviceError = (
      error: DailyCameraErrorObject<DailyCameraErrorType>
    ) => {
      const devices: DeviceArray = [];
      switch (error.type) {
        case 'permissions': {
          error.blockedMedia.forEach((d) => {
            devices.push(d === 'video' ? 'cam' : 'mic');
          });
          return new DeviceError(devices, error.type, error.msg, {
            blockedBy: error.blockedBy,
          });
        }
        case 'not-found': {
          error.missingMedia.forEach((d) => {
            devices.push(d === 'video' ? 'cam' : 'mic');
          });
          return new DeviceError(devices, error.type, error.msg);
        }
        case 'constraints': {
          error.failedMedia.forEach((d) => {
            devices.push(d === 'video' ? 'cam' : 'mic');
          });
          return new DeviceError(devices, error.type, error.msg, {
            reason: error.reason,
          });
        }
        case 'cam-in-use': {
          devices.push('cam');
          return new DeviceError(devices, 'in-use', error.msg);
        }
        case 'mic-in-use': {
          devices.push('mic');
          return new DeviceError(devices, 'in-use', error.msg);
        }
        case 'cam-mic-in-use': {
          devices.push('cam');
          devices.push('mic');
          return new DeviceError(devices, 'in-use', error.msg);
        }
        case 'undefined-mediadevices':
        case 'unknown':
        default: {
          devices.push('cam');
          devices.push('mic');
          return new DeviceError(devices, error.type, error.msg);
        }
      }
    };
    this._callbacks.onDeviceError?.(generateDeviceError(ev.error));
  }

  private handleTrackStarted(ev: DailyEventObjectTrack) {
    if (ev.type === 'screenAudio' || ev.type === 'screenVideo') {
      this._callbacks.onScreenTrackStarted?.(
        ev.track,
        ev.participant
          ? dailyParticipantToParticipant(ev.participant)
          : undefined
      );
    } else {
      this._callbacks.onTrackStarted?.(
        ev.track,
        ev.participant
          ? dailyParticipantToParticipant(ev.participant)
          : undefined
      );
    }
  }

  private handleTrackStopped(ev: DailyEventObjectTrack) {
    if (ev.type === 'screenAudio' || ev.type === 'screenVideo') {
      this._callbacks.onScreenTrackStopped?.(
        ev.track,
        ev.participant
          ? dailyParticipantToParticipant(ev.participant)
          : undefined
      );
    } else {
      this._callbacks.onTrackStopped?.(
        ev.track,
        ev.participant
          ? dailyParticipantToParticipant(ev.participant)
          : undefined
      );
    }
  }

  private handleParticipantJoined(ev: DailyEventObjectParticipant) {
    const p = dailyParticipantToParticipant(ev.participant);

    this._callbacks.onParticipantJoined?.(p);

    if (p.local) return;

    this._botId = ev.participant.session_id;

    this._callbacks.onBotConnected?.(p);
  }

  private handleParticipantLeft(ev: DailyEventObjectParticipantLeft) {
    const p = dailyParticipantToParticipant(ev.participant);

    this._callbacks.onParticipantLeft?.(p);

    if (p.local) return;

    this._botId = '';

    this._callbacks.onBotDisconnected?.(p);
  }

  private handleLocalAudioLevel(ev: DailyEventObjectLocalAudioLevel) {
    this._callbacks.onLocalAudioLevel?.(ev.audioLevel);
  }

  private handleRemoteAudioLevel(
    ev: DailyEventObjectRemoteParticipantsAudioLevel
  ) {
    const participants = this._daily.participants();

    for (const participantId in ev.participantsAudioLevel) {
      if (ev.participantsAudioLevel.hasOwnProperty(participantId)) {
        const audioLevel = ev.participantsAudioLevel[participantId];
        let participant = participants[participantId];
        if (audioLevel && participant) {
          this._callbacks.onRemoteAudioLevel?.(
            audioLevel,
            dailyParticipantToParticipant(participant)
          );
        }
      }
    }
  }

  private handleLeftMeeting() {
    this.state = 'disconnected';
    this._botId = '';
    this._callbacks.onDisconnected?.();
  }

  private handleFatalError(ev: DailyEventObjectFatalError) {
    logger.error('Daily fatal error', ev.errorMsg);
    this.state = 'error';
    this._botId = '';
    this._callbacks.onError?.(RTVIMessage.error(ev.errorMsg, true));
  }

  private handleNonFatalError(ev: DailyEventObjectNonFatalError) {
    switch (ev.type) {
      case 'screen-share-error':
        this._callbacks.onScreenShareError?.(ev.errorMsg);
        break;
    }
  }
}

const dailyParticipantToParticipant = (p: DailyParticipant): Participant => ({
  id: p.user_id,
  local: p.local,
  name: p.user_name,
});
