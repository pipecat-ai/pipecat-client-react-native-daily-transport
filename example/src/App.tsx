import {
  View,
  SafeAreaView,
  StyleSheet,
  Text,
  Button,
  TextInput,
} from "react-native"

import React, { useEffect, useState } from "react"

import { RNDailyTransport } from '@pipecat-ai/react-native-daily-transport';
import { RTVIClient, TransportState } from '@pipecat-ai/client-js';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f9fa",
    width: "100%",
  },
  mainContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20
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
    fontStyle: "normal",
    fontWeight: "normal",
    borderWidth: 1,
    width: "100%",
  },
})

export default function App() {

  const [roomUrl, setRoomUrl] = useState<string>(process.env.EXPO_PUBLIC_BASE_URL || '')

  const [pipecatClient, setPipecatClient] = useState<RTVIClient|undefined>()

  const [inCall, setInCall] = useState<boolean>(false)
  const [currentState, setCurrentState] = useState<TransportState>("disconnected")

  const createPipecatClient = () => {
    return new RTVIClient({
      transport: new RNDailyTransport(),
      params: {
        baseUrl: roomUrl,
        config: [
          {
            service: "tts",
            options: [
              { name: "voice", value: "79a125e8-cd45-4c13-8a67-188112f4dd22" },
            ],
          },
          {
            service: "llm",
            options: [
              { name: "model", value: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo" },
              {
                name: "initial_messages",
                value: [
                  {
                    role: "system",
                    content:
                      "You are a assistant called ExampleBot. You can ask me anything. Keep responses brief and legible. Your responses will converted to audio. Please do not include any special characters in your response other than '!' or '?'. Start by briefly introducing yourself.",
                  },
                ],
              },
              { name: "run_on_config", value: true },
            ],
          },
        ],
        // Note: In a production environment, it is recommended to avoid calling Daily's API endpoint directly.
        // Instead, you should route requests through your own server to handle authentication, validation,
        // and any other necessary logic. Therefore, the baseUrl should be set to the URL of your own server.
        headers: new Headers({
          "Authorization": `Bearer ${process.env.EXPO_PUBLIC_DAILY_API_KEY}`
        }),
        requestData: {
          "bot_profile": "voice_2024_10",
          "max_duration": 680,
          services: {
            llm: "together",
            tts: "cartesia",
          },
        },
        endpoints: {
          connect: "/start",
          action: "/action"
        }
      },
      enableMic: true,
      enableCam: false
    })
  }

  const start = async () => {
    try {
      let pipecatClient = createPipecatClient()
      setPipecatClient(pipecatClient)
      await pipecatClient?.connect()
    } catch (e) {
      console.log("Failed to start the bot", e)
    }
  }

  const leave = async () => {
    try {
      if (pipecatClient) {
        await pipecatClient.disconnect()
        setCurrentState(pipecatClient.state)
        setPipecatClient(undefined)
      }
    } catch (e) {
      console.log("Failed to disconnect", e)
    }
  }

  //Add the listeners
  useEffect(() => {
    if (!pipecatClient) {
      return
    }
    pipecatClient
      .on("transportStateChanged", (state) => {
        setCurrentState(pipecatClient.state)
        const inCallStates = ["authenticating", "connecting", "connected", "ready"];
        setInCall(inCallStates.includes(state))
      })
      .on("botLlmText", (data) => {
        console.log("Received botLlmText:", data)
      })
      .on("error", (error) => {
        console.log("Received error:", error)
      })
    return () => {}
  }, [pipecatClient])

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
            value={roomUrl}
            onChangeText={(newRoomURL) => {
              setRoomUrl(newRoomURL)
            }}
          />
          <Button
            onPress={() => start()}
            title="Connect"
          ></Button>
        </View>
      )}
    </SafeAreaView>
  )
}
