import torch
import torch.nn.functional as F
from PIL import Image
from transformers import SiglipProcessor, SiglipModel
import faiss
import numpy as np
import os
import json
import time

class LostAndFoundMatcher:
    def __init__(self):
        print("Loading SigLIP 2 model...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.processor = SiglipProcessor.from_pretrained("google/siglip2-base-patch16-224")
        self.model = SiglipModel.from_pretrained("google/siglip2-base-patch16-224").to(self.device).eval()
        self.index = faiss.IndexFlatIP(768)
        self.metadata = []
        print(f"Ready on {self.device}!")

    def get_embedding(self, img_path):
        img = Image.open(img_path).convert("RGB")
        inputs = self.processor(images=img, return_tensors="pt").to(self.device)
        with torch.no_grad():
            out = self.model.get_image_features(**inputs)
            # Handle object vs tensor return
            emb = out.pooler_output if hasattr(out, 'pooler_output') else out
            emb = F.normalize(emb, dim=-1)
        return emb.cpu().numpy().astype('float32')

    def get_text_embedding(self, text):
        inputs = self.processor(text=[text], padding="max_length", truncation=True, return_tensors="pt").to(self.device)
        with torch.no_grad():
            out = self.model.get_text_features(**inputs)
            # Handle object vs tensor return
            emb = out.pooler_output if hasattr(out, 'pooler_output') else out
            emb = F.normalize(emb, dim=-1)
        return emb.cpu().numpy().astype('float32')

    def add_found_item(self, img_path, location, contact, description="", category=""):
        if img_path:
            emb = self.get_embedding(img_path)
            filename = os.path.basename(img_path)
        else:
            text_desc = f"{category} {description}".strip()
            emb = self.get_text_embedding(text_desc if text_desc else "unknown item")
            filename = f"no_image_{int(time.time())}.png"
            
        self.index.add(emb)
        self.metadata.append({
            "filename": filename,
            "location": location,
            "contact": contact,
            "description": description,
            "category": category
        })
        print(f"Added: {filename}")

    def find_matches_by_image(self, lost_img_path, top_k=3):
        query = self.get_embedding(lost_img_path)
        scores, indices = self.index.search(query, k=top_k)
        return self._format_results(scores[0], indices[0], is_text=False)

    def find_matches_by_text(self, text_query, top_k=6):
        """Hybrid search: description keywords (+ synonyms/brands) AND SigLIP visual score."""
        from text_search import hybrid_rank, semantic_prompt
        n = self.index.ntotal
        if n == 0 or not self.metadata:
            return []
        sem_scores = None
        try:
            query = self.get_text_embedding(semantic_prompt(text_query))
            scores, indices = self.index.search(query, k=n)      # score EVERY item, not just top 3
            sem_scores = [0.0] * n
            for sc, ix in zip(scores[0], indices[0]):
                if ix != -1:
                    sem_scores[ix] = float(sc)
        except Exception as e:
            print(f"Semantic text scoring failed, using keywords only: {e}")
        return hybrid_rank(text_query, self.metadata, sem_scores, top_k=top_k)

    def _format_results(self, scores, indices, is_text=False):
        results = []
        # - Text-to-image similarity drops below 0.07 for unrelated items.
        # - Image-to-image similarity drops below 0.18 for unrelated items.
        threshold = 0.07 if is_text else 0.18
        
        for score, idx in zip(scores, indices):
            if idx == -1:
                continue
            
            raw_score = float(score)
            
            # Skip items below the threshold to avoid random matches
            if raw_score < threshold:
                continue
                
            item = self.metadata[idx]
            
            # Scale the score for display (Human-friendly %)
            if is_text:
                display_score = min(0.99, max(0.10, (raw_score * 4.0) + 0.10))
                confidence = "High" if raw_score > 0.15 else "Medium"
            else:
                display_score = min(0.99, max(0.10, (raw_score * 2.5) + 0.10))
                confidence = "High" if raw_score > 0.25 else "Medium"
            
            # Create a dictionary copy with all item fields + scoring fields
            res_item = {
                "rank": len(results)+1,
                "similarity": round(display_score, 4),
                "raw_score": round(raw_score, 4),
                "confidence": confidence
            }
            # Copy all fields from item metadata
            for key, val in item.items():
                res_item[key] = val
                
            results.append(res_item)
        return results


    def save(self, path="./"):
        faiss.write_index(self.index, os.path.join(path, "found_items.index"))
        print("Saved index!")

    def load(self, path="./"):
        if os.path.exists(os.path.join(path, "found_items.index")):
            self.index = faiss.read_index(os.path.join(path, "found_items.index"))
            print(f"Loaded index with {self.index.ntotal} items")

    def rebuild_index(self, base_dir):
        """Rebuilds FAISS index to ensure it perfectly matches the metadata array"""
        self.index = faiss.IndexFlatIP(768)
        for item in self.metadata:
            filename = item.get("filename", "")
            found_path = os.path.join(base_dir, "found_items", filename)
            lost_path = os.path.join(base_dir, "lost_items", filename)
            
            if os.path.exists(found_path):
                emb = self.get_embedding(found_path)
            elif os.path.exists(lost_path):
                emb = self.get_embedding(lost_path)
            else:
                text_desc = f"{item.get('category', '')} {item.get('description', '')}".strip()
                emb = self.get_text_embedding(text_desc if text_desc else "unknown item")
            
            self.index.add(emb)
        print(f"Rebuilt index with {self.index.ntotal} items to match metadata length {len(self.metadata)}")