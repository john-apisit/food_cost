import { handleExpandMapsRequest } from '../src/server/expandGoogleMapsUrl.ts'

type RequestLike = {
  method?: string
  query?: { url?: string | string[] }
}

type ResponseLike = {
  status: (code: number) => { json: (body: unknown) => void }
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const raw = req.query?.url
  const urlParam = Array.isArray(raw) ? raw[0] : raw ?? null
  const result = await handleExpandMapsRequest(urlParam)
  res.status(result.status).json(result.body)
}
