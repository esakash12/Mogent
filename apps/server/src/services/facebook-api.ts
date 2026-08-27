import { config } from "../config";

export interface FbCustomerProfile {
  first_name?: string;
  last_name?: string;
  profile_pic?: string;
  locale?: string;
  timezone?: number;
  gender?: string;
}

export interface FbButton {
  type: "web_url" | "postback" | "phone_number";
  url?: string;
  title: string;
  payload?: string;
}

export class FacebookApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `https://graph.facebook.com/${config.facebook.graphVersion}`;
  }

  /**
   * Sends a text message to a customer via Facebook Messenger Send API.
   */
  public async sendTextMessage(
    pageAccessToken: string,
    recipientPsid: string,
    text: string
  ): Promise<any> {
    const url = `${this.baseUrl}/me/messages?access_token=${pageAccessToken}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        messaging_type: "RESPONSE",
        message: { text },
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      throw new Error(`Facebook Send API Error (${res.status}): ${errorData}`);
    }

    return res.json();
  }

  /**
   * Sends an interactive button template message via Facebook Messenger Send API.
   */
  public async sendButtonMessage(
    pageAccessToken: string,
    recipientPsid: string,
    text: string,
    buttons: FbButton[]
  ): Promise<any> {
    const url = `${this.baseUrl}/me/messages?access_token=${pageAccessToken}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        messaging_type: "RESPONSE",
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: text.slice(0, 640),
              buttons: buttons.slice(0, 3).map((b) => ({
                ...b,
                title: b.title.slice(0, 20),
              })),
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error(`Facebook Button Send API Error (${res.status}): ${errorData}`);
      // Graceful fallback to regular text message if button template fails
      return this.sendTextMessage(pageAccessToken, recipientPsid, text);
    }

    return res.json();
  }

  /**
   * Sends typing bubble indicator ("typing_on" / "typing_off") to simulate human typing.
   */
  public async sendTypingIndicator(
    pageAccessToken: string,
    recipientPsid: string,
    action: "typing_on" | "typing_off" | "mark_seen"
  ): Promise<void> {
    const url = `${this.baseUrl}/me/messages?access_token=${pageAccessToken}`;

    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientPsid },
          sender_action: action,
        }),
      });
    } catch {
      // Non-critical action, ignore errors
    }
  }

  /**
   * Fetches the customer's public Facebook profile details.
   */
  public async fetchCustomerProfile(
    pageAccessToken: string,
    psid: string
  ): Promise<FbCustomerProfile | null> {
    if (!pageAccessToken || !psid) return null;

    // Safe, non-restricted standard profile fields for Facebook Graph API
    const url = `${this.baseUrl}/${psid}?fields=first_name,last_name,name,profile_pic&access_token=${pageAccessToken}`;

    try {
      let res = await fetch(url);
      let data: any = null;

      if (res.ok) {
        data = await res.json();
      } else {
        // Fallback 1: Try minimal name fields directly on PSID
        const minimalUrl = `${this.baseUrl}/${psid}?fields=name,first_name,last_name&access_token=${pageAccessToken}`;
        const fallbackRes = await fetch(minimalUrl);
        if (fallbackRes.ok) {
          data = await fallbackRes.json();
        } else {
          // Fallback 2: Page Conversation Thread Participants (ALWAYS accessible to Page Access Token)
          try {
            const convUrl = `${this.baseUrl}/me/conversations?fields=participants&limit=50&access_token=${pageAccessToken}`;
            const convRes = await fetch(convUrl);
            if (convRes.ok) {
              const convData: any = await convRes.json();
              for (const thread of convData.data || []) {
                const match = (thread.participants?.data || []).find((p: any) => p.id === psid);
                if (match && match.name) {
                  data = { name: match.name, first_name: match.name.split(" ")[0], last_name: match.name.split(" ").slice(1).join(" ") };
                  break;
                }
              }
            }
          } catch (convErr) {
            console.warn(`Thread participant fallback error for PSID [${psid}]:`, convErr);
          }
        }
      }

      if (!data) {
        return null;
      }
      
      let firstName = data.first_name;
      let lastName = data.last_name;
      
      if (!firstName && data.name) {
        const parts = data.name.trim().split(" ");
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }

      return {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        profile_pic: data.profile_pic || undefined,
      };
    } catch (err) {
      console.warn(`Facebook fetchCustomerProfile network error for PSID [${psid}]:`, err);
      return null;
    }
  }
}

export const facebookApi = new FacebookApiService();
