const express=require("express");
const session=require("express-session");
const Database=require("better-sqlite3");
const bcrypt=require("bcryptjs");
const multer=require("multer");
const helmet=require("helmet");
const path=require("path");
const fs=require("fs");

const app=express();
const PORT=process.env.PORT||3000;
const db=new Database("veya.db");
const uploadDir=path.join(__dirname,"uploads");
if(!fs.existsSync(uploadDir))fs.mkdirSync(uploadDir,{recursive:true});

app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:"1mb"}));
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret:process.env.SESSION_SECRET||"dev-only-change-me",
  resave:false,saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:86400000}
}));
app.use("/uploads",express.static(uploadDir));
app.use(express.static(path.join(__dirname,"public")));

db.exec(`
CREATE TABLE IF NOT EXISTS products(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 price INTEGER NOT NULL,
 category TEXT NOT NULL,
 description TEXT DEFAULT '',
 image TEXT DEFAULT '',
 stock INTEGER DEFAULT 0,
 active INTEGER DEFAULT 1,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 phone TEXT NOT NULL,
 city TEXT NOT NULL,
 address TEXT NOT NULL,
 items TEXT NOT NULL,
 total INTEGER NOT NULL,
 status TEXT DEFAULT 'new',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin(
 id INTEGER PRIMARY KEY,
 username TEXT NOT NULL,
 password_hash TEXT NOT NULL
);
`);

const adminUser=process.env.ADMIN_USER||"admin";
const adminPass=process.env.ADMIN_PASSWORD||"change-me-now";
const existing=db.prepare("SELECT id FROM admin WHERE id=1").get();
if(!existing){
  db.prepare("INSERT INTO admin(id,username,password_hash) VALUES(1,?,?)")
    .run(adminUser,bcrypt.hashSync(adminPass,12));
}

if(db.prepare("SELECT COUNT(*) c FROM products").get().c===0){
 const ins=db.prepare("INSERT INTO products(name,price,category,description,image,stock) VALUES(?,?,?,?,?,?)");
 [
  ["Classic Shoulder Bag",1499,"Purses","A versatile everyday shoulder bag.","",10],
  ["Mini Crossbody Bag",1299,"Purses","Compact everyday style.","",10],
  ["Soft Zip Wallet",799,"Wallets","Simple everyday wallet.","",10],
  ["Modern Square Shades",999,"Glasses","Clean, modern sunglasses.","",10],
  ["Classic Everyday Watch",1799,"Watches","Minimal everyday watch.","",10]
 ].forEach(x=>ins.run(...x));
}

function auth(req,res,next){
 if(req.session.admin)return next();
 res.status(401).json({error:"Unauthorized"});
}

const storage=multer.diskStorage({
 destination:uploadDir,
 filename:(req,file,cb)=>{
  const ext=path.extname(file.originalname).toLowerCase();
  cb(null,Date.now()+"-"+Math.random().toString(36).slice(2)+ext);
 }
});
const upload=multer({storage,limits:{fileSize:5*1024*1024},
 fileFilter:(req,file,cb)=>cb(null,/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

app.get("/api/products",(req,res)=>{
 const rows=db.prepare("SELECT * FROM products WHERE active=1 ORDER BY id DESC").all();
 res.json(rows);
});

app.post("/api/login",(req,res)=>{
 const {username,password}=req.body;
 const a=db.prepare("SELECT * FROM admin WHERE id=1").get();
 if(username===a.username && bcrypt.compareSync(password,a.password_hash)){
  req.session.admin=true; return res.json({ok:true});
 }
 res.status(401).json({error:"Invalid login"});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>res.json({admin:!!req.session.admin}));

app.get("/api/admin/products",auth,(req,res)=>{
 res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all());
});
app.post("/api/admin/products",auth,upload.single("image"),(req,res)=>{
 const {name,price,category,description,stock}=req.body;
 if(!name||!price||!category)return res.status(400).json({error:"Missing required fields"});
 const image=req.file?"/uploads/"+req.file.filename:"";
 const r=db.prepare("INSERT INTO products(name,price,category,description,image,stock) VALUES(?,?,?,?,?,?)")
  .run(name,Number(price),category,description||"",image,Number(stock||0));
 res.json(db.prepare("SELECT * FROM products WHERE id=?").get(r.lastInsertRowid));
});
app.put("/api/admin/products/:id",auth,upload.single("image"),(req,res)=>{
 const old=db.prepare("SELECT * FROM products WHERE id=?").get(req.params.id);
 if(!old)return res.status(404).json({error:"Not found"});
 const {name,price,category,description,stock,active}=req.body;
 const image=req.file?"/uploads/"+req.file.filename:old.image;
 db.prepare("UPDATE products SET name=?,price=?,category=?,description=?,stock=?,active=?,image=? WHERE id=?")
  .run(name,Number(price),category,description||"",Number(stock||0),active==="0"?0:1,image,req.params.id);
 res.json({ok:true});
});
app.delete("/api/admin/products/:id",auth,(req,res)=>{
 db.prepare("UPDATE products SET active=0 WHERE id=?").run(req.params.id);
 res.json({ok:true});
});

app.post("/api/orders",(req,res)=>{
 const {name,phone,city,address,items}=req.body;
 if(!name||!phone||!city||!address||!Array.isArray(items)||!items.length)
   return res.status(400).json({error:"Please complete all fields"});
 let total=0;
 const clean=[];
 for(const x of items){
  const p=db.prepare("SELECT id,name,price,stock,active FROM products WHERE id=?").get(x.id);
  const qty=Math.max(1,Math.min(20,Number(x.qty||1)));
  if(!p||!p.active||p.stock<qty)return res.status(400).json({error:"One of the selected products is unavailable"});
  total+=p.price*qty;
  clean.push({id:p.id,name:p.name,price:p.price,qty});
 }
 const tx=db.transaction(()=>{
  for(const x of clean)db.prepare("UPDATE products SET stock=stock-? WHERE id=?").run(x.qty,x.id);
  const r=db.prepare("INSERT INTO orders(name,phone,city,address,items,total) VALUES(?,?,?,?,?,?)")
    .run(name,phone,city,address,JSON.stringify(clean),total);
  return r.lastInsertRowid;
 });
 const id=tx();
 res.json({ok:true,orderId:id,total});
});

app.get("/api/admin/orders",auth,(req,res)=>{
 const rows=db.prepare("SELECT * FROM orders ORDER BY id DESC").all()
   .map(x=>({...x,items:JSON.parse(x.items)}));
 res.json(rows);
});
app.patch("/api/admin/orders/:id",auth,(req,res)=>{
 const allowed=["new","confirmed","shipped","delivered","cancelled"];
 if(!allowed.includes(req.body.status))return res.status(400).json({error:"Invalid status"});
 db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status,req.params.id);
 res.json({ok:true});
});

app.get("*",(req,res)=>{
 res.sendFile(path.join(__dirname,"public","index.html"));
});

app.listen(PORT,()=>console.log("VEYA running on port "+PORT));