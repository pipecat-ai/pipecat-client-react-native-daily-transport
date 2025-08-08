import {
  View,
  SafeAreaView,
  StyleSheet,
  Text,
  Button,
  TextInput,
} from 'react-native';

import React, { useState } from 'react';

import { RNDailyTransport } from '@pipecat-ai/react-native-daily-transport';
import { PipecatClient, TransportState } from '@pipecat-ai/client-js';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f9fa',
    width: '100%',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    color: '#333',
  },
  baseUrlInput: {
    borderRadius: 8,
    marginVertical: 8,
    padding: 12,
    fontStyle: 'normal',
    fontWeight: 'normal',
    borderWidth: 1,
    width: '100%',
  },
});

export default function App() {
  const [baseUrl, setBaseUrl] = useState<string>(
    process.env.EXPO_PUBLIC_BASE_URL || ''
  );

  const [pipecatClient, setPipecatClient] = useState<
    PipecatClient | undefined
  >();

  const [inCall, setInCall] = useState<boolean>(false);
  const [currentState, setCurrentState] =
    useState<TransportState>('disconnected');

  const createPipecatClient = () => {
    return new PipecatClient({
      transport: new RNDailyTransport(),
      enableMic: true,
      enableCam: false,
      callbacks: {
        onConnected: () => {
          setInCall(true);
        },
        onDisconnected: () => {
          setInCall(false);
        },
        onTransportStateChanged: (state) => {
          console.log(`Transport state changed: ${state}`);
          setCurrentState(state);
        },
        onError: (error) => {
          console.log('Error:', JSON.stringify(error));
        },
      },
    });
  };

  const start = async () => {
    try {
      let client = createPipecatClient();
      await client?.startBotAndConnect({
        endpoint: baseUrl + '/connect',
      });
      setPipecatClient(client);
    } catch (e) {
      console.log('Failed to start the bot', e);
    }
  };

  const leave = async () => {
    try {
      if (pipecatClient) {
        await pipecatClient.disconnect();
        setPipecatClient(undefined);
      }
    } catch (e) {
      console.log('Failed to disconnect', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {inCall ? (
        <View style={styles.mainContainer}>
          <Text style={styles.title}>RTVI session state:</Text>
          <Text style={styles.text}>{currentState}</Text>
          <Button
            onPress={() => leave()}
            color="#FF0000" // Red color
            title="Disconnect"
          ></Button>
        </View>
      ) : (
        <View style={styles.mainContainer}>
          <Text style={styles.title}>Connect to an RTVI server</Text>
          <Text style={styles.text}>Backend URL</Text>
          <TextInput
            style={styles.baseUrlInput}
            value={baseUrl}
            onChangeText={(newbaseUrl) => {
              setBaseUrl(newbaseUrl);
            }}
          />
          <Button onPress={() => start()} title="Connect"></Button>
        </View>
      )}
    </SafeAreaView>
  );
}
