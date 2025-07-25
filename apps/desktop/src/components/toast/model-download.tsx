import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { sonnerToast, toast } from "@hypr/ui/components/ui/toast";
import { showLlmModelDownloadToast, showSttModelDownloadToast } from "./shared";

export default function ModelDownloadNotification() {
  const queryClient = useQueryClient();
  const currentSttModel = useQuery({
    queryKey: ["current-stt-model"],
    queryFn: () => localSttCommands.getCurrentModel(),
  });

  const currentLlmModel = useQuery({
    queryKey: ["current-llm-model"],
    queryFn: () => localLlmCommands.getCurrentModel(),
  });

  const checkForModelDownload = useQuery({
    enabled: !!currentSttModel.data,
    queryKey: ["check-model-downloaded"],
    queryFn: async () => {
      const [stt, llm] = await Promise.all([
        localSttCommands.isModelDownloaded(currentSttModel.data!),
        localLlmCommands.isModelDownloaded(currentLlmModel.data!),
      ]);

      return {
        currentSttModel,
        sttModelDownloaded: stt,
        llmModelDownloaded: llm,
      };
    },
    refetchInterval: 5000,
  });

  const sttModelDownloading = useQuery({
    enabled: !checkForModelDownload.data?.sttModelDownloaded,
    queryKey: ["stt-model-downloading"],
    queryFn: async () => {
      return localSttCommands.isModelDownloading(currentSttModel.data!);
    },
    refetchInterval: 3000,
  });

  const llmModelDownloading = useQuery({
    enabled: !checkForModelDownload.data?.llmModelDownloaded,
    queryKey: ["llm-model-downloading"],
    queryFn: async () => {
      return localLlmCommands.isModelDownloading(currentLlmModel.data!);
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!checkForModelDownload.data) {
      return;
    }

    if (checkForModelDownload.data?.sttModelDownloaded && checkForModelDownload.data?.llmModelDownloaded) {
      return;
    }

    if (sttModelDownloading.data || llmModelDownloading.data) {
      return;
    }

    const needsSttModel = !checkForModelDownload.data?.sttModelDownloaded;
    const needsLlmModel = !checkForModelDownload.data?.llmModelDownloaded;

    let title: string;
    let content: string;
    let buttonLabel: string;

    if (needsSttModel && needsLlmModel) {
      title = "Transcribing & Enhancing AI Needed";
      content = "Both STT models and LLMs are required for offline functionality.";
      buttonLabel = "Download Both Models";
    } else if (needsSttModel) {
      title = "Transcribing Model Needed";
      content = "The STT model is required for offline transcribing functionality.";
      buttonLabel = "Download Transcribing Model";
    } else if (needsLlmModel) {
      title = "Enhancing AI Model Needed";
      content = "The LLM model is required for offline enhancing functionality.";
      buttonLabel = "Download HyprLLM v1";
    } else {
      return;
    }

    toast({
      id: "model-download-needed",
      title,
      content,
      buttons: [
        {
          label: buttonLabel,
          onClick: () => {
            sonnerToast.dismiss("model-download-needed");

            if (needsSttModel && !sttModelDownloading.data) {
              showSttModelDownloadToast(currentSttModel.data!, undefined, queryClient);
            }

            if (needsLlmModel && !llmModelDownloading.data) {
              showLlmModelDownloadToast(undefined, undefined, queryClient);
            }
          },
          primary: true,
        },
      ],
      dismissible: false,
    });
  }, [checkForModelDownload.data, sttModelDownloading.data, llmModelDownloading.data]);

  return null;
}
