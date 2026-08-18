import java.security.MessageDigest;

public class Weak {
    public static byte[] md5(byte[] data) throws Exception {
        return MessageDigest.getInstance("MD5").digest(data);
    }
}
