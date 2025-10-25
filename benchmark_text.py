from transformers import pipeline
import time

# List of text models to test, from smallest to largest
models_to_test = [
    'distilbert-base-uncased-finetuned-sst-2-english', # Task: sentiment-analysis
    'bert-base-uncased',                               # Task: fill-mask
    'bert-large-uncased'                               # Task: fill-mask
]

# --- Test for sentiment analysis (DistilBERT) ---
print(f"\n--- Testing Model: {models_to_test[0]} ---")
print("Loading pipeline...")
start_time = time.time()
# Explicitly set device='mps'
classifier = pipeline('sentiment-analysis', model=models_to_test[0], device='mps')
load_time = time.time() - start_time
print(f"Model loaded in {load_time:.2f} seconds.")

text_to_analyze = "This is a test of the model's performance."
print(f"Analyzing text: '{text_to_analyze}'")
start_time = time.time()
result = classifier(text_to_analyze)
inference_time = time.time() - start_time
print(f"Result: {result}")
print(f"--> Inference took {inference_time:.4f} seconds.\n")


# --- Test for mask filling (BERT base and large) ---
text_for_masking = "The capital of France is [MASK]."
for model_name in models_to_test[1:]:
    print(f"\n--- Testing Model: {model_name} ---")
    print("Loading pipeline...")
    try:
        start_time = time.time()
        # Explicitly set device='mps'
        unmasker = pipeline('fill-mask', model=model_name, device='mps')
        load_time = time.time() - start_time
        print(f"Model loaded in {load_time:.2f} seconds.")

        print(f"Analyzing text: '{text_for_masking}'")
        start_time = time.time()
        result = unmasker(text_for_masking)
        inference_time = time.time() - start_time
        # Print only the top result for brevity
        print(f"Result: {result[0]}")
        print(f"--> Inference took {inference_time:.4f} seconds.\n")

    except Exception as e:
        print(f"Could not run test for {model_name}. Error: {e}")
        
print("All tests completed successfully.")