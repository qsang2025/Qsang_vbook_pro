// OpenAI-compatible streaming template for vBook AI Provider.
// Runtime: Rhino ES6 only.
function execute(messagesJson, selectedModel) {
    var messages = JSON.parse(messagesJson);
    var targetModel = selectedModel || model;
    var response = fetch(base_url + "/chat/completions", {
        method: "POST",
        stream: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_key
        },
        body: JSON.stringify({
            model: targetModel,
            messages: messages,
            stream: true
        })
    });
    if (!response.ok) {
        return Response.error("Lỗi kết nối AI: HTTP " + response.status);
    }

    var line;
    while ((line = response.readLine()) !== null) {
        if (line.indexOf("data: ") !== 0) continue;
        var payload = line.substring(6).trim();
        if (!payload || payload === "[DONE]") continue;
        var json = JSON.parse(payload);
        var token = json.choices && json.choices[0] && json.choices[0].delta
            ? json.choices[0].delta.content
            : "";
        if (token) {
            ai.emitToken(token);
        }
    }
    return Response.success("");
}
