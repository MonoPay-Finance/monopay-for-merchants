// app/api/send-notification/route.ts

export async function POST(request: Request) {
  const { token, title, body, data } = await request.json() as {
		token: string;
		title: string;
		body: string;
		data: Record<string, string>;
    };

    const WORKER_URL = process.env.WORKER_URL!;
    const WORKER_SECRET = process.env.WORKER_SECRET? process.env.WORKER_SECRET : '1234';
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Secret": WORKER_SECRET,
    },
    body: JSON.stringify({ token, title, body, data }),
  });

  const result = await response.json();

  return Response.json(result);
}