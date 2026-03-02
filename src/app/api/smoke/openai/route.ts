import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { callOpenAIChatCompletion } from "@/lib/openaiClient";
import { getTextModelId } from "@/lib/textGeneration";
import { extractJsonPayload } from "@/lib/aiUtils";

export async function GET() {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const model = getTextModelId();

  try {
    const response = await callOpenAIChatCompletion({
      model,
      temperature: 0,
      max_tokens: 40,
      messages: [
        {
          role: "system",
          content:
            "Respond with valid JSON only. The JSON must include ok=true and the used model name.",
        },
        {
          role: "user",
          content: `Acknowledge you are available via ${model}.`,
        },
      ],
    });

    const completion = response.choices[0]?.message?.content ?? "";
    const parsedResult = extractJsonPayload(completion);

    if (!parsedResult.success) {
      return NextResponse.json(
        {
          error:
            "OpenAI completion did not return a parsable JSON payload.",
          reason: parsedResult.error.reason,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      data: {
        model,
        ok: parsedResult.payload.ok === true,
        raw: parsedResult.payload,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "OpenAI smoke check failed." },
      { status: 502 }
    );
  }
}
