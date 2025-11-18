# app/chatbot_wrapper.py
import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# Workaround for DynamicCache compatibility issue with transformers 4.57+
try:
    from transformers.cache_utils import DynamicCache
    # Patch DynamicCache to add missing seen_tokens attribute if it doesn't exist
    if not hasattr(DynamicCache, 'seen_tokens'):
        def _get_seen_tokens(self):
            # Return the sequence length as seen_tokens for compatibility
            # Try to get seq length from the cache itself or first layer
            try:
                if hasattr(self, 'get_seq_length'):
                    return self.get_seq_length()
            except:
                pass
            try:
                if hasattr(self, 'layers') and len(self.layers) > 0:
                    return self.layers[0].get_seq_length()
            except:
                pass
            return 0
        DynamicCache.seen_tokens = property(_get_seen_tokens)
except (ImportError, AttributeError):
    pass

class Chatbot:
    def __init__(self):
        print("Initializing BFSI Chatbot (CPU-compatible, generate() based)...")

        BASE_MODEL_ID = "microsoft/Phi-3-mini-4k-instruct"
        # Update this path if you moved your LoRA adapters
        LORA_ADAPTER_PATH = r"C:\Users\jaink\Downloads\phi3-bfsi-adapters\phi3-bfsi-finetuned"

        self.device = torch.device("cpu")

        # Load base model (CPU)
        try:
            print("Loading base model (this may take time on CPU)...")
            # use float32 on CPU for maximum compatibility
            self.model = AutoModelForCausalLM.from_pretrained(
                BASE_MODEL_ID,
                torch_dtype=torch.float32,
                trust_remote_code=True,
                device_map=None,
                low_cpu_mem_usage=True
            )
            self.model.config.use_cache = False

        except Exception as e:
            print("Error loading base model:", e)
            self.model = None
            self.tokenizer = None
            return

        # Load tokenizer
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_ID, trust_remote_code=True)
            # ensure pad token
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
        except Exception as e:
            print("Error loading tokenizer:", e)
            self.model = None
            self.tokenizer = None
            return

        # Load LoRA adapter (PEFT) and merge if possible
        try:
            print("Loading LoRA adapter from:", LORA_ADAPTER_PATH)
            self.model = PeftModel.from_pretrained(self.model, LORA_ADAPTER_PATH, device_map=None)
            # Try to merge adapter weights into base model for simpler CPU inference
            try:
                self.model = self.model.merge_and_unload()
            except Exception:
                # some PEFT versions may not support `merge_and_unload`; ignore if not available
                pass
            self.model.eval()
            # Ensure cache is disabled after PEFT loading
            if hasattr(self.model, 'config'):
                self.model.config.use_cache = False
            # Set generation config to disable cache
            if hasattr(self.model, 'generation_config'):
                self.model.generation_config.use_cache = False
            # move model to CPU
            try:
                self.model.to(self.device)
            except Exception:
                pass
        except Exception as e:
            print("Error loading LoRA adapter:", e)
            # leave model as-is (maybe adapter not present)
            # We'll still allow the base model (if adapter isn't required)
            # But if you require adapter, stop here
            # set model to None to indicate unavailability
            self.model = None
            return

        # generation config defaults
        self.gen_kwargs = {
            "max_new_tokens": 150,
            "do_sample": True,
            "temperature": 0.7,
            "top_p": 0.9,
            # pad token id ensures safe generation
            "pad_token_id": self.tokenizer.eos_token_id,
            # Explicitly disable cache to avoid DynamicCache compatibility issues
            "use_cache": False,
        }

        print("Chatbot initialized successfully (CPU generate()).")

    def _build_prompt(self, message, history=None):
        # Use tokenizer's chat template if available, otherwise fallback to simple formatting
        messages = [
            {"role": "system", "content": "You are a BFSI domain expert. Answer concisely and accurately."},
            {"role": "user", "content": message}
        ]
        try:
            prompt = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        except Exception:
            # simple fallback
            prompt = "System: You are a BFSI domain expert.\nUser: " + message + "\nAssistant:"
        return prompt

    def get_reply(self, message: str, history=None):
        if self.model is None or self.tokenizer is None:
            return "Chatbot model not loaded. Check backend logs.", {}

        prompt = self._build_prompt(message, history=history)

        try:
            # Tokenize and move to device
            inputs = self.tokenizer(prompt, return_tensors="pt", padding=True).to(self.device)
            input_ids = inputs["input_ids"]

            # Generate
            with torch.no_grad():
                # Create a generation config that explicitly disables cache
                from transformers import GenerationConfig
                gen_config = GenerationConfig.from_model_config(self.model.config)
                gen_config.use_cache = False
                
                outputs = self.model.generate(
                    input_ids=input_ids,
                    generation_config=gen_config,
                    past_key_values=None,  # Explicitly disable past_key_values cache
                    **self.gen_kwargs
                )

            # outputs[0] is the full token sequence (prompt + response). We try to decode only the generated tail.
            generated_ids = outputs[0]
            # If generated is longer than input, slice the tail
            if generated_ids.shape[0] > input_ids.shape[1]:
                # the tail tokens after the prompt
                tail = generated_ids[input_ids.shape[1]:]
            else:
                tail = generated_ids

            # Decode tail; if tail empty, decode full and attempt to strip prompt
            if tail.shape[0] > 0:
                reply = self.tokenizer.decode(tail, skip_special_tokens=True).strip()
            else:
                decoded = self.tokenizer.decode(generated_ids, skip_special_tokens=True)
                # attempt to remove prompt prefix (best-effort)
                reply = decoded.replace(prompt, "").strip()

        except Exception as e:
            reply = f"Generation error: {e}"

        return reply, {"source": "phi3-bfsi-lora"}
