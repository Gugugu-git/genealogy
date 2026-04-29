-- Supabase 数据库表创建脚本
-- 在 Supabase 控制台的 SQL Editor 中执行此脚本

-- 1. 创建 profiles 表（用户信息表）
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'visitor' CHECK (role IN ('admin', 'visitor')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id)
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. 设置行级安全策略（RLS）
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 允许已登录用户查看所有profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

-- 只允许用户更新自己的profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 只允许用户插入自己的profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. 创建存储函数：自动创建profile（可选）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, role, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        'visitor',
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建触发器：新用户注册时自动创建profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. 完成！
-- 现在您可以：
-- - 用户注册时自动创建profile
-- - 通过Supabase Auth管理用户认证
-- - 在应用中查询和管理用户

-- 验证表是否创建成功
SELECT * FROM public.profiles LIMIT 0;
