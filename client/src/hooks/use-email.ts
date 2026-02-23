import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { SendEmailRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useSendEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SendEmailRequest) => {
      const validated = api.email.send.input.parse(data);
      const res = await fetch(api.email.send.path, {
        method: api.email.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to send email");
      }
      
      return api.email.send.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.applications.list.path] });
      toast({ 
        title: "Email Sent Successfully! 🚀", 
        description: "Your outreach has been delivered and logged." 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to send email", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });
}
