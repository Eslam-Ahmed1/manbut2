import Message from "../models/messages.js";
import Chat from "../models/chats.js";
import { appError } from "../../utils/appErrors.js";

interface chatDTO {
    chat_id: string,
    content: string
}
interface userDTO {
    _id: string
}

const send_message = async (chatDTO: chatDTO, userId: string) => {
    const chatId = chatDTO.chat_id;
    const content = chatDTO.content;

    const chatExists = await Chat.findOne({ _id: chatId, user_id: userId });
    if (!chatExists) {
        throw new appError("Chat not found or access denied", 404);
    }

    const userMessage = new Message({
        chat_id: chatId,
        sender: 'user',
        content: content
    });

    // Get last 20 messages for history
    const messageHistory = await Message.find({ chat_id: chatId }).sort({ sent_at: -1 }).limit(20);
    await userMessage.save();

    // Map history to OpenAI format compatible with OpenRouter
    let extractMessages = messageHistory.map(value => {
        return {
            role: value.sender === "user" ? "user" : "assistant",
            content: value.content
        };
    });
    extractMessages = extractMessages.reverse();

    // System instruction defining the personality of Manbat AI
    const systemPrompt = `You are Manbat AI (منبت), an expert plant doctor AI assistant. 
                        Your ONLY purpose is to answer questions about plants, agriculture, botany, and plant diseases. 
                        STRICT RULES:
                        1. You are EXPLICITLY FORBIDDEN from answering questions about geography, politics, history, general science, math, or any non-plant topics.
                        2. Do NOT try to bridge non-plant topics back to agriculture. Do not provide the answer to the off-topic question.
                        3. If a question is outside of plants and agriculture, you must reject it and reply EXACTLY with this Arabic phrase and nothing else:
                        "I only answer plant-related questions"`;
    // Prepare complete message list including system instruction and current message
    const openRouterMessages = [
        { role: "system", content: systemPrompt },
        ...extractMessages,
        { role: "user", content: content }
    ];

    const apiKey = process.env.OPENROUTER_API_KEY || "";
    const modelName = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";

    if (!apiKey) {
        throw new appError("OpenRouter API key is missing", 500);
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://manbut.com",
                "X-Title": "Manbut AI"
            },
            body: JSON.stringify({
                model: modelName,
                messages: openRouterMessages
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("OpenRouter API Error:", errBody);
            throw new appError(`OpenRouter request failed: ${response.statusText}`, 502);
        }

        const data = await response.json() as { choices: { message: { content: string } }[] };
        const AiText = data.choices?.[0]?.message?.content || "No response received.";

        const aiMessage = new Message({
            chat_id: chatId,
            sender: 'ai',
            content: AiText
        });
        await aiMessage.save();

        return AiText;
    } catch (error) {
        console.error("Chat service error:", error);
        throw error;
    }
};

const new_chat = async (userDTO: userDTO) => {
    const userId = userDTO._id;
    const newChat = new Chat({
        user_id: userId
    });
    const chatId = (await newChat.save())._id;
    return chatId;
};

export { new_chat, send_message };
