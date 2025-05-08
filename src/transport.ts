import Daily, {
  DailyCall,
  DailyEventObjectAppMessage,
  DailyEventObjectAvailableDevicesUpdated,
  DailyEventObjectLocalAudioLevel,
  DailyEventObjectNonFatalError,
  DailyEventObjectParticipant,
  DailyEventObjectParticipantLeft,
  DailyEventObjectRemoteParticipantsAudioLevel,
  DailyEventObjectTrack,
  DailyParticipant,
} from '@daily-co/react-native-daily-js';

import {
  Participant,
  Tracks,
  Transport,
  TransportStartError,
  TransportState,
  RTVIClientOptions,
  RTVIMessage,
  RTVIError,
} from '@pipecat-ai/client-js';
import { MediaDeviceInfo } from '@daily-co/react-native-webrtc';

export interface DailyTransportAuthBundle {
  room_url: string;
  token: string;
}

export class RNDailyTransport extends Transport {
  // Not able to use declare fields here
  // opened issue: https://github.com/facebook/create-react-app/issues/8918
  private _daily: DailyCall | undefined;
  private _botId: string = '';
  private _selectedCam: MediaDeviceInfo | Record<string, never> = {};
  private _selectedMic: MediaDeviceInfo | Record<string, never> = {};
  private _selectedSpeaker: MediaDeviceInfo | Record<string, never> = {};

  constructor() {
    super();
  }

  public initialize(
    options: RTVIClientOptions,
    messageHandler: (ev: RTVIMessage) => void
  ): void {
    this._callbacks = options.callbacks ?? {};
    this._onMessage = messageHandler;

    const existingInstance = Daily.getCallInstance();
    if (existingInstance) {
      void existingInstance.destroy();
    }

    this._daily = Daily.createCallObject({
      startVideoOff: !(options.enableCam == true),
      startAudioOff: options.enableMic == false,
      allowMultipleCallInstances: true,
      dailyConfig: {},
    });

    this.attachEventListeners();

    this.state = 'disconnected';

    console.debug('[RTVI Transport] Initialized');
  }

  get state(): TransportState {
    return this._state;
  }

  private set state(state: TransportState) {
    if (this._state === state) return;

    this._state = state;
    this._callbacks.onTransportStateChanged?.(state);
  }

  async getAllCams() {
    const { devices } = await this._daily!.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput') as MediaDeviceInfo[];
  }

  updateCam(camId: string) {
    this._daily!.setCamera(camId).then(async () => {
      let inputDevices = await this._daily!.getInputDevices();
      this._selectedCam = inputDevices.camera as MediaDeviceInfo;
    });
  }

  get selectedCam() {
    return this._selectedCam;
  }

  async getAllMics() {
    const { devices } = await this._daily!.enumerateDevices();
    return devices.filter((d) => d.kind === 'audio') as MediaDeviceInfo[];
  }

  updateMic(micId: string) {
    this._daily!.setAudioDevice(micId).then(async () => {
      let inputDevices = await this._daily!.getInputDevices();
      this._selectedMic = inputDevices.mic as MediaDeviceInfo;
    });
  }

  get selectedMic() {
    return this._selectedMic;
  }

  async getAllSpeakers() {
    const { devices } = await this._daily!.enumerateDevices();
    return devices.filter((d) => d.kind === 'audio');
  }

  updateSpeaker(speakerId: string) {
    this._daily?.setAudioDevice(speakerId).then(async () => {
      const devicesInUse = await this._daily!.getInputDevices();
      this._selectedSpeaker = devicesInUse?.speaker;
    });
  }

  get selectedSpeaker() {
    return this._selectedSpeaker;
  }

  enableMic(enable: boolean) {
    this._daily!.setLocalAudio(enable);
  }

  get isMicEnabled() {
    return this._daily!.localAudio();
  }

  enableCam(enable: boolean) {
    this._daily!.setLocalVideo(enable);
  }

  get isCamEnabled() {
    return this._daily!.localVideo();
  }

  enableScreenShare(enable: boolean) {
    if (enable) {
      this._daily!.startScreenShare();
    } else {
      this._daily!.stopScreenShare();
    }
  }

  get isSharingScreen(): boolean {
    return this._daily!.localScreenAudio() || this._daily!.localScreenVideo();
  }

  tracks() {
    const participants = this._daily?.participants();
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

  async connect(
    authBundle: DailyTransportAuthBundle,
    abortController: AbortController
  ) {
    if (!this._daily) {
      throw new RTVIError('Transport instance not initialized');
    }

    if (abortController.signal.aborted) return;

    this.state = 'connecting';

    try {
      await this._daily.join({
        url: authBundle.room_url,
        token: authBundle.token,
      });

      const room = await this._daily.room();
      if (room && 'id' in room && room.config && room.config.exp) {
        this._expiry = room.config.exp;
      }
    } catch (e) {
      this.state = 'error';
      throw new TransportStartError();
    }

    if (abortController.signal.aborted) return;

    this.state = 'connected';

    this._callbacks.onConnected?.();
  }

  async sendReadyMessage(): Promise<void> {
    return new Promise<void>((resolve) => {
      (async () => {
        this._daily!.on('track-started', (ev) => {
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
    this._daily!.on(
      'available-devices-updated',
      this.handleAvailableDevicesUpdated.bind(this)
    );

    this._daily!.on(
      // TODO, we need to add DailyEventObjectSelectedDevicesUpdated to types overrides inside react-ntive-daily-js
      // @ts-ignore
      'selected-devices-updated',
      this.handleSelectedDevicesUpdated.bind(this)
    );

    this._daily!.on('track-started', this.handleTrackStarted.bind(this));
    this._daily!.on('track-stopped', this.handleTrackStopped.bind(this));
    this._daily!.on(
      'participant-joined',
      this.handleParticipantJoined.bind(this)
    );
    this._daily!.on('participant-left', this.handleParticipantLeft.bind(this));
    this._daily!.on('local-audio-level', this.handleLocalAudioLevel.bind(this));
    this._daily!.on(
      'remote-participants-audio-level',
      this.handleRemoteAudioLevel.bind(this)
    );
    this._daily!.on('app-message', this.handleAppMessage.bind(this));
    this._daily!.on('left-meeting', this.handleLeftMeeting.bind(this));
    this._daily!.on('nonfatal-error', this.handleNonFatalError.bind(this));
  }

  async disconnect() {
    this._daily!.stopLocalAudioLevelObserver();
    this._daily!.stopRemoteParticipantsAudioLevelObserver();

    await this._daily!.leave();
    await this._daily!.destroy();
  }

  public sendMessage(message: RTVIMessage) {
    this._daily!.sendAppMessage(message, '*');
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
    const participants = this._daily!.participants();

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

  private handleNonFatalError(ev: DailyEventObjectNonFatalError) {
    switch (ev.type) {
      case 'screen-share-error':
        this._callbacks.onScreenShareError?.(ev.errorMsg);
        break;
    }
  }

  get expiry(): number | undefined {
    return this._expiry;
  }
}

const dailyParticipantToParticipant = (p: DailyParticipant): Participant => ({
  id: p.user_id,
  local: p.local,
  name: p.user_name,
});
